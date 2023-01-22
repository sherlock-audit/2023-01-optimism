import { ethers } from 'ethers'
import { DeployFunction } from 'hardhat-deploy/dist/types'

import {
  assertContractVariable,
  deploy,
  getContractFromArtifact,
} from '../src/deploy-utils'

const deployFn: DeployFunction = async (hre) => {
  const OptimismPortalProxy = await getContractFromArtifact(
    hre,
    'OptimismPortalProxy'
  )

  await deploy({
    hre,
    name: 'L1CrossDomainMessenger',
    args: [OptimismPortalProxy.address],
    postDeployAction: async (contract) => {
      await assertContractVariable(
        contract,
        'PORTAL',
        OptimismPortalProxy.address
      )
      await assertContractVariable(
        contract,
        'owner',
        ethers.constants.AddressZero
      )
    },
  })
}

deployFn.tags = ['L1CrossDomainMessengerImpl', 'setup']

export default deployFn
