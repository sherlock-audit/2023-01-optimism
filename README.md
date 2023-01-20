# Optimism contest details

- Join [Sherlock Discord](https://discord.gg/MABEWyASkp)
- Submit findings using the issue page in your private contest repo (label issues as med or high)
- [Read for more details](https://docs.sherlock.xyz/audits/watsons)

### Disclaimer: Given the nature of the contest, the judging criteria differ from standard Sherlock judging rules. Severity definitions are custom defined by Optimism, and will be outlined on this page prior to the start of the competition.

# System context

For this competition, you’ll be looking at Optimism on the [Goerli network.](https://community.optimism.io/docs/developers/bedrock/public-testnets/#goerli) This system was [recently upgraded](https://community.optimism.io/docs/developers/bedrock/public-testnets/#goerli) from our legacy system to the new [Bedrock architecture](https://community.optimism.io/docs/developers/bedrock/how-is-bedrock-different/).

This means that, rather than looking for bugs in the contract’s source code, you’ll be able to interact with a live system, complete with block explorers and other infrastructure.

It also opens the door to issues resulting from any errors made during the deployment and upgrade process.

Our system is composed of a significant amount of both Go and Solidity. Given the size of the code base, we’ll do our best to guide you towards the kinds of bugs we anticipate you might find, and where to look for them.

# Reward structure

The maximum total prize pool for this competition is $700k. All amounts will paid out in 1/3 USDC, and 2/3 OP token.

The total prize amount to be paid out depends on the severity of the findings, as follows:

1.  The minimum contest is $75k. This amount will be paid out to reporters of Low Severity issues.
2.  If ANY valid Medium Severity issue is found, the contest pot increases to $250k.
3.  If ANY valid High severity issue is found, the contest pot increases to $700k.

# Resources

The following resources will be useful for helping to understand the system.

-   [Plain english specs for Optimism](https://github.com/ethereum-optimism/optimism/blob/f30376825c82f62b846590487fe46b7435213d37/specs/README.md)
-   A list of [predeployed L2 contracts](https://github.com/ethereum-optimism/optimism/blob/f30376825c82f62b846590487fe46b7435213d37/specs/predeploys.md#L48)
-   Guide to [running an Optimism node](https://community.optimism.io/docs/developers/bedrock/node-operator-guide/) on [Goerli](https://community.optimism.io/docs/developers/bedrock/public-testnets/)
-   The Optimism Monorepo at [a commit](https://github.com/ethereum-optimism/optimism/tree/3f4b3c328153a8aa03611158b6984d624b17c1d9) from the time of the Goerli migration.
-   Previous audit reports can be a useful source of ideas for where to look, and what to look for. They can all be found [here](https://github.com/ethereum-optimism/optimism/tree/develop/technical-documents/security-reviews) in our monorepo, or directly from the links below (dates given are from the start of the engagement:
    -   Zeppelin review of early Bedrock contracts, [April 2022](https://github.com/ethereum-optimism/optimism/blob/develop/technical-documents/security-reviews/2022_05-Bedrock_Contracts-Zeppelin.pdf)
    -   Trail of Bits review of the Rollup Node and Optimistic Geth, [April 2022](https://github.com/ethereum-optimism/optimism/blob/develop/technical-documents/security-reviews/2022_05-OpNode-TrailOfBits.pdf)
    -   Sigma Prime review of the Rollup Node and Optimistic Geth, [June 2022](https://github.com/ethereum-optimism/optimism/blob/develop/technical-documents/security-reviews/2022_08-Bedrock_GoLang-SigmaPrime.pdf)
    -   Zeppelin review of the ERC20 and ERC721 Bridge, [July 2022](https://github.com/ethereum-optimism/optimism/blob/f30376825c82f62b846590487fe46b7435213d37/technical-documents/security-reviews/2022_09-Bedrock_and_Periphery-Zeppelin.pdf)
    -   Trail of Bits invariant definition and testing engagement, [September 2022](https://github.com/ethereum-optimism/optimism/blob/develop/technical-documents/security-reviews/2022_11-Invariant_Testing-TrailOfBits.pdf)
    -   Trail of Bits review of final Bedrock updates, [November 2022](https://github.com/ethereum-optimism/optimism/blob/develop/technical-documents/security-reviews/2023_01-Bedrock_Updates-TrailOfBits.pdf)
    
