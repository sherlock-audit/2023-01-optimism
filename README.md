# Optimism contest details

- Join [Sherlock Discord](https://discord.gg/MABEWyASkp)
- Submit findings using the issue page in your private contest repo (label issues as med or high)
- [Read for more details](https://docs.sherlock.xyz/audits/watsons)

### Disclaimer: Given the nature of the contest, the judging criteria will differ from standard Sherlock judging rules. Severity definitions are custom defined by Optimism, and will be outlined on this page prior to the start of the competition.

# Reward structure

The maximum total prize pool for this competition is $700k. All amounts will paid out in 1/3 USDC, and 2/3 OP token.

The total prize amount to be paid out depends on the severity of the findings, as follows:

1. The minimum contest pot is $75k. This amount will be paid out to reporters of Low Severity issues. (Yes, this is contrary to the usual Sherlock contest format).
2. If ANY valid Medium Severity issue is found, the contest pot increases to $250k.
3. If ANY valid High severity issue is found, the contest pot increases to $700k.

# System context

For this competition, you’ll be looking at Optimism on the [Goerli network.](https://community.optimism.io/docs/developers/bedrock/public-testnets/#goerli) This system was [recently upgraded](https://community.optimism.io/docs/developers/bedrock/public-testnets/#goerli) from our legacy system to the new [Bedrock architecture](https://community.optimism.io/docs/developers/bedrock/how-is-bedrock-different/). 

Unlike a typical Sherlock competition, rather than looking for bugs in source code, you’ll be able to interact with a live system, complete with block explorers and other infrastructure.

It also opens the door to issues that might result from errors made during the deployment and upgrade process.

Our system is composed of of both Golang and Solidity. Given the size of the code base, we’ll do our best to guide you towards the kinds of bugs we anticipate you might find, and where to look for them.

# Scope

The key components of the system can be found in our monorepo at commit [3f4b3c3281](https://github.com/ethereum-optimism/optimism/tree/3f4b3c328153a8aa03611158b6984d624b17c1d9). 

- [L1 Contracts](https://github.com/ethereum-optimism/optimism/tree/3f4b3c328153a8aa03611158b6984d624b17c1d9/packages/contracts-bedrock/contracts/L1)
- [L2 Contracts (AKA Predeploys)](https://github.com/ethereum-optimism/optimism/tree/3f4b3c328153a8aa03611158b6984d624b17c1d9/packages/contracts-bedrock/contracts/L2)
- [op-node](https://github.com/ethereum-optimism/optimism/tree/3f4b3c328153a8aa03611158b6984d624b17c1d9/op-node)
- [op-geth](https://github.com/ethereum-optimism/op-geth) (in its own repo)

# Resources

The following resources will be useful for helping to understand the system.

- [How optimistic rollups and Optimism work](https://community.optimism.io/docs/protocol/2-rollup-protocol/#), including differences between the legacy and bedrock systems.
- [Plain english specs for Optimism](https://github.com/ethereum-optimism/optimism/blob/f30376825c82f62b846590487fe46b7435213d37/specs/README.md)
- [Overview of the diff between op-geth and upstream geth](https://op-geth.optimism.io/)
- A list of [predeployed L2 contracts](https://github.com/ethereum-optimism/optimism/blob/f30376825c82f62b846590487fe46b7435213d37/specs/predeploys.md#L48)
- Guide to [running an Optimism node](https://community.optimism.io/docs/developers/bedrock/node-operator-guide/) on [Goerli](https://community.optimism.io/docs/developers/bedrock/public-testnets/)
- [Goerli Etherscan](https://goerli.etherscan.io/) and [Optimism Goerli Etherscan](https://goerli-optimism.etherscan.io/)
- Previous audit reports can be a useful source of ideas for where to look, and what to look for. They can be found in the [Optimism monorepo](https://github.com/ethereum-optimism/optimism/tree/develop/technical-documents/security-reviews) or directly via the links below (dates given are from the start of the engagement). These audits are also outlined, along with other bedrock related security initiatives, in this [blog post](https://dev.optimism.io/bedrock-security/).
    - Zeppelin review of early Bedrock contracts, [April 2022](https://github.com/ethereum-optimism/optimism/blob/develop/technical-documents/security-reviews/2022_05-Bedrock_Contracts-Zeppelin.pdf)
    - Trail of Bits review of the Rollup Node and Optimistic Geth, [April 2022](https://github.com/ethereum-optimism/optimism/blob/develop/technical-documents/security-reviews/2022_05-OpNode-TrailOfBits.pdf)
    - Sigma Prime review of the Rollup Node and Optimistic Geth, [June 2022](https://github.com/ethereum-optimism/optimism/blob/develop/technical-documents/security-reviews/2022_08-Bedrock_GoLang-SigmaPrime.pdf)
    - Zeppelin review of the ERC20 and ERC721 Bridge, [July 2022](https://github.com/ethereum-optimism/optimism/blob/f30376825c82f62b846590487fe46b7435213d37/technical-documents/security-reviews/2022_09-Bedrock_and_Periphery-Zeppelin.pdf)
    - Trail of Bits invariant definition and testing engagement, [September 2022](https://github.com/ethereum-optimism/optimism/blob/develop/technical-documents/security-reviews/2022_11-Invariant_Testing-TrailOfBits.pdf)
    - Trail of Bits review of final Bedrock updates, [November 2022](https://github.com/ethereum-optimism/optimism/blob/develop/technical-documents/security-reviews/2023_01-Bedrock_Updates-TrailOfBits.pdf)

# Known issues

The following issues are known and will not be accepted as valid findings:

1. There is an edge case in which ETH deposited to the `OptimismPortal` by a contract can be irrecoverably stranded:
    
    When a deposit transaction fails to execute, the sender's account balance is still credited with the mint value. However, if the deposit's L1 sender is a contract, the `tx.origin` on L2 will be [aliased](https://github.com/ethereum-optimism/optimism/blob/develop/specs/deposits.md#address-aliasing), and this aliased address will receive the minted on L2. In general the contract on L1 will not be able to recover these funds. 
    
    We have documented this risk and encourage users to take advantage of our CrossDomainMessenger contracts which provide additional safety measures.
    
2. Some of the ‘legacy’ events in the `L1StandardBridge` and `L2StandardBrige` do not emit when expected.

# What to look for

In order to guide you, we've attempted to outline as clearly as possible the the types of attacks we'd like you to pursue. Issues which do not match those described below will be considered, but are not guaranteed to be accepted. 

## High Severity issues

### ************Bridge Vulnerabilities************

The following attacks focus on our bridge; especially how data and assets are transferred between the base chain (Goerli) and the rollup (Optimism Goerli). The majority bridge attacks would be possible due to an issue in the contracts, however there is also a critical interaction between the contracts on L1, and our fork of geth (op-geth) which is relevant (see below).

**Attack patterns to seek out**

- Bypass the deposit fee logic, causing the sequencer to improperly mint ETH on Optimism
    - **Explanation:** The op-node service reads events which are emitted by the Optimism Portal contract on L1, and parses those events in order to create deposit transactions which can mint ETH on L2. Can you fool that logic into minting ETH, without actually having to deposit your ETH into the Optimism Portal contract?
- Successfully replay a previously completed withdrawal
    - **Explanation:** Because our bridge contracts are being upgraded from a previous state, it’s possible that a misconfiguration could cause previously completed withdrawals to be replayed. This is somewhat similar to the [Nomad bridge vulnerability](https://medium.com/nomad-xyz-blog/nomad-bridge-hack-root-cause-analysis-875ad2e5aacd).
- Forge a withdrawal proof such that you can prove an invalid withdrawal
    - **Explanation:** We have a Solidity implementation of the Merkle Patricia Tree. Can you trick it into verifying the existence of a withdrawal which does not exist? This type of attack would be similar to that of the [Binance Bridge attack](https://www.zellic.io/blog/binance-bridge-hack-in-laymans-terms).
- Bypass the two step withdrawal proof logic
    - **Explanation:** In order to mitigate against possible bugs in our withdrawal proof, we’ve introduced a two step withdrawal process which requires users to prove their withdrawal at the beginning of the 7 day waiting period. We think it’s pretty clever, but would love to hear if you can find a way to get around it.

### **********************************Migration attacks**********************************

During the migration from the legacy system to Bedrock, the Optimism network is temporarily halted, and undergoes a process of ‘state surgery’, which directly modifies the bytecode and storage of certain contracts. See if you can cause any of the above items to occur as a result of the state surgery.

**Attack pattern to look for:**

- Put the legacy system into a pre-migration state such that our migration scripts will result in any of the following:
    1. User balances which do not match the legacy system
    2. ETH minted or destroyed as a result of the migration
    3. Contract state which does not match the legacy system (aside from that which is clearly intended to be modified)

### Generic smart contract issues

Some of the most common smart contract vulnerabilities also apply here and are critically important to mitigate.

**Attack patterns to seek out**

- Authorization bypass issues enabling an attacker to take actions which should be restricted to one of the system’s special actors, ie. Proposer, Challenger or Batch Submitter
- Upgradability, proxy and configuration issues enabling
- Unexpected reverts causing a system lockup (ie. due to overflows)
- Any theft or freezing of funds issues.

## Medium Severity Issues

### Infrastructure vulnerabilities

**Attack patterns to seek out**

- Causing a consensus failure
    - **Explanation:** There is one sequencer op-node submitting transaction batches to L1, but many verifier op-nodes will read these batches and check the results of its execution. The sequencer and verifiers must remain in consensus, even in the event of an L1 reorg.
- DoS Attacks on Critical services
    - **Explanation:** Any untrusted inputs which can result in a crash or otherwise cause a denial of service. Attack surfaces include but are not limited to P2P payloads, RPC payloads, blockchain state. Moreover, the network should even be robust against batches which could be posted by a malicious sequencer.

### **Execution layer vulnerabilities**

Bedrock’s design aims for [EVM equivalence](https://medium.com/ethereum-optimism/introducing-evm-equivalence-5c2021deb306), meaning that smart contract developers should be able to safely deploy the same contracts to Optimism as they would on Ethereum, without concern for differences in the execution. 

**Attack pattern to look for**

- Differences in the programming model on Optimism, which result in unexpected vulnerabilities in contracts.
    - **Example:** An example of a bug which occurred in an earlier version of Optimism was an [ETH inflation attack](https://www.saurik.com/optimism.html) which resulted from a difference between the semantics of `SELFDESTRUCT` in Optimism vs. Ethereum.

## Low Severity Items

Low severity issues are not typically included in Sherlock competitions, but are acceptable in this contest. However the only acceptable Low severity items are inconsistencies between the [specs](https://github.com/ethereum-optimism/optimism/tree/develop/specs) and the implementation.

**Guidelines:**

Findings are restricted to factually incorrect information only, i.e. statements which describe something different from what that implementation actually does.

The following limitations apply:

1. Findings regarding a lack of detail or missing information in the spec will not be accepted.
2. Findings regarding broken links or spelling errors will not be accepted.
