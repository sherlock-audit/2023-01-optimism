import {
  BaseServiceV2,
  StandardOptions,
  ExpressRouter,
  Gauge,
  validators,
  waitForProvider,
} from '@eth-optimism/common-ts'
import { getChainId, sleep, toRpcHexString } from '@eth-optimism/core-utils'
import { CrossChainMessenger } from '@eth-optimism/sdk'
import { Provider } from '@ethersproject/abstract-provider'
import { Contract, ethers, Transaction } from 'ethers'
import dateformat from 'dateformat'

import { version } from '../package.json'
import {
  findFirstUnfinalizedStateBatchIndex,
  findEventForStateBatch,
  updateStateBatchEventCache,
  PartialEvent,
} from './helpers'

type Options = {
  l1RpcProvider: Provider
  l2RpcProvider: Provider
  startBatchIndex: number
}

type Metrics = {
  highestBatchIndex: Gauge
  isCurrentlyMismatched: Gauge
  nodeConnectionFailures: Gauge
}

type State = {
  fpw: number
  scc: Contract
  messenger: CrossChainMessenger
  highestCheckedBatchIndex: number
  diverged: boolean
}

export class FaultDetector extends BaseServiceV2<Options, Metrics, State> {
  constructor(options?: Partial<Options & StandardOptions>) {
    super({
      version,
      name: 'fault-detector',
      loop: true,
      options: {
        loopIntervalMs: 1000,
        ...options,
      },
      optionsSpec: {
        l1RpcProvider: {
          validator: validators.provider,
          desc: 'Provider for interacting with L1',
        },
        l2RpcProvider: {
          validator: validators.provider,
          desc: 'Provider for interacting with L2',
        },
        startBatchIndex: {
          validator: validators.num,
          default: -1,
          desc: 'Batch index to start checking from',
          public: true,
        },
      },
      metricsSpec: {
        highestBatchIndex: {
          type: Gauge,
          desc: 'Highest batch indices (checked and known)',
          labels: ['type'],
        },
        isCurrentlyMismatched: {
          type: Gauge,
          desc: '0 if state is ok, 1 if state is mismatched',
        },
        nodeConnectionFailures: {
          type: Gauge,
          desc: 'Number of times node connection has failed',
          labels: ['layer', 'section'],
        },
      },
    })
  }

  async init(): Promise<void> {
    // Connect to L1.
    await waitForProvider(this.options.l1RpcProvider, {
      logger: this.logger,
      name: 'L1',
    })

    // Connect to L2.
    await waitForProvider(this.options.l2RpcProvider, {
      logger: this.logger,
      name: 'L2',
    })

    this.state.messenger = new CrossChainMessenger({
      l1SignerOrProvider: this.options.l1RpcProvider,
      l2SignerOrProvider: this.options.l2RpcProvider,
      l1ChainId: await getChainId(this.options.l1RpcProvider),
      l2ChainId: await getChainId(this.options.l2RpcProvider),
    })

    // Not diverged by default.
    this.state.diverged = false

    // We use this a lot, a bit cleaner to pull out to the top level of the state object.
    this.state.scc = this.state.messenger.contracts.l1.StateCommitmentChain
    this.state.fpw = (await this.state.scc.FRAUD_PROOF_WINDOW()).toNumber()

    // Populate the event cache.
    this.logger.info(`warming event cache, this might take a while...`)
    await updateStateBatchEventCache(this.state.scc)

    // Figure out where to start syncing from.
    if (this.options.startBatchIndex === -1) {
      this.logger.info(`finding appropriate starting height`)
      const firstUnfinalized = await findFirstUnfinalizedStateBatchIndex(
        this.state.scc
      )

      // We may not have an unfinalized batches in the case where no batches have been submitted
      // for the entire duration of the FPW. We generally do not expect this to happen on mainnet,
      // but it happens often on testnets because the FPW is very short.
      if (firstUnfinalized === undefined) {
        this.logger.info(`no unfinalized batches found, starting from latest`)
        this.state.highestCheckedBatchIndex = (
          await this.state.scc.getTotalBatches()
        ).toNumber()
      } else {
        this.state.highestCheckedBatchIndex = firstUnfinalized
      }
    } else {
      this.state.highestCheckedBatchIndex = this.options.startBatchIndex
    }

    this.logger.info(`starting height`, {
      startBatchIndex: this.state.highestCheckedBatchIndex,
    })
  }

  async routes(router: ExpressRouter): Promise<void> {
    router.get('/status', async (req, res) => {
      return res.status(200).json({
        ok: !this.state.diverged,
      })
    })
  }

  async main(): Promise<void> {
    let latestBatchIndex: number
    try {
      latestBatchIndex = (await this.state.scc.getTotalBatches()).toNumber()
    } catch (err) {
      this.logger.error(`got error when connecting to node`, {
        error: err,
        node: 'l1',
        section: 'getTotalBatches',
      })
      this.metrics.nodeConnectionFailures.inc({
        layer: 'l1',
        section: 'getTotalBatches',
      })
      await sleep(15000)
      return
    }

    if (this.state.highestCheckedBatchIndex >= latestBatchIndex) {
      await sleep(15000)
      return
    } else {
      this.metrics.highestBatchIndex.set(
        {
          type: 'known',
        },
        latestBatchIndex
      )
    }

    this.logger.info(`checking batch`, {
      batchIndex: this.state.highestCheckedBatchIndex,
      latestIndex: latestBatchIndex,
    })

    let event: PartialEvent
    try {
      event = await findEventForStateBatch(
        this.state.scc,
        this.state.highestCheckedBatchIndex
      )
    } catch (err) {
      this.logger.error(`got error when connecting to node`, {
        error: err,
        node: 'l1',
        section: 'findEventForStateBatch',
      })
      this.metrics.nodeConnectionFailures.inc({
        layer: 'l1',
        section: 'findEventForStateBatch',
      })
      await sleep(15000)
      return
    }

    let batchTransaction: Transaction
    try {
      batchTransaction = await this.options.l1RpcProvider.getTransaction(
        event.transactionHash
      )
    } catch (err) {
      this.logger.error(`got error when connecting to node`, {
        error: err,
        node: 'l1',
        section: 'getTransaction',
      })
      this.metrics.nodeConnectionFailures.inc({
        layer: 'l1',
        section: 'getTransaction',
      })
      await sleep(15000)
      return
    }

    const [stateRoots] = this.state.scc.interface.decodeFunctionData(
      'appendStateBatch',
      batchTransaction.data
    )

    const batchStart = event.args._prevTotalElements.toNumber() + 1
    const batchSize = event.args._batchSize.toNumber()
    const batchEnd = batchStart + batchSize

    let latestBlock: number
    try {
      latestBlock = await this.options.l2RpcProvider.getBlockNumber()
    } catch (err) {
      this.logger.error(`got error when connecting to node`, {
        error: err,
        node: 'l2',
        section: 'getBlockNumber',
      })
      this.metrics.nodeConnectionFailures.inc({
        layer: 'l2',
        section: 'getBlockNumber',
      })
      await sleep(15000)
      return
    }

    if (latestBlock < batchEnd) {
      this.logger.info(`node is behind, waiting for sync`, {
        batchEnd,
        latestBlock,
      })
      return
    }

    // `getBlockRange` has a limit of 1000 blocks, so we have to break this request out into
    // multiple requests of maximum 1000 blocks in the case that batchSize > 1000.
    let blocks: any[] = []
    for (let i = 0; i < batchSize; i += 1000) {
      let newBlocks: any[]
      try {
        newBlocks = await (
          this.options.l2RpcProvider as ethers.providers.JsonRpcProvider
        ).send('eth_getBlockRange', [
          toRpcHexString(batchStart + i),
          toRpcHexString(batchStart + i + Math.min(batchSize - i, 1000) - 1),
          false,
        ])
      } catch (err) {
        this.logger.error(`got error when connecting to node`, {
          error: err,
          node: 'l2',
          section: 'getBlockRange',
        })
        this.metrics.nodeConnectionFailures.inc({
          layer: 'l2',
          section: 'getBlockRange',
        })
        await sleep(15000)
        return
      }

      blocks = blocks.concat(newBlocks)
    }

    for (const [i, stateRoot] of stateRoots.entries()) {
      if (blocks[i].stateRoot !== stateRoot) {
        this.state.diverged = true
        this.metrics.isCurrentlyMismatched.set(1)
        this.logger.error(`state root mismatch`, {
          blockNumber: blocks[i].number,
          expectedStateRoot: blocks[i].stateRoot,
          actualStateRoot: stateRoot,
          finalizationTime: dateformat(
            new Date(
              (ethers.BigNumber.from(blocks[i].timestamp).toNumber() +
                this.state.fpw) *
                1000
            ),
            'mmmm dS, yyyy, h:MM:ss TT'
          ),
        })
        return
      }
    }

    this.state.highestCheckedBatchIndex++
    this.metrics.highestBatchIndex.set(
      {
        type: 'checked',
      },
      this.state.highestCheckedBatchIndex
    )

    // If we got through the above without throwing an error, we should be fine to reset.
    this.state.diverged = false
    this.metrics.isCurrentlyMismatched.set(0)
  }
}

if (require.main === module) {
  const service = new FaultDetector()
  service.run()
}
