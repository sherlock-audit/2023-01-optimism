import { DeployFunction } from 'hardhat-deploy/dist/types'
import '@eth-optimism/hardhat-deploy-config'

import {
  assertContractVariable,
  deploy,
  getContractFromArtifact,
} from '../src/deploy-utils'

const deployFn: DeployFunction = async (hre) => {
  const L2OutputOracleProxy = await getContractFromArtifact(
    hre,
    'L2OutputOracleProxy'
  )

  await deploy({
    hre,
    name: 'OptimismPortal',
    args: [
      L2OutputOracleProxy.address,
      hre.deployConfig.finalizationPeriodSeconds,
    ],
    postDeployAction: async (contract) => {
      await assertContractVariable(
        contract,
        'L2_ORACLE',
        L2OutputOracleProxy.address
      )
      await assertContractVariable(
        contract,
        'FINALIZATION_PERIOD_SECONDS',
        hre.deployConfig.finalizationPeriodSeconds
      )
    },
  })
}

deployFn.tags = ['OptimismPortalImpl', 'setup']

export default deployFn
