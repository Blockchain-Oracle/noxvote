// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { IVotes } from "@openzeppelin/contracts/governance/utils/IVotes.sol";

struct GovernorDeploymentConfig {
    string name;
    IVotes token;
    uint256 timelockMinDelay;
    uint48 initialVotingDelay;
    uint32 initialVotingPeriod;
    uint256 initialProposalThreshold;
    uint256 initialQuorumNumerator;
    uint32 minimumPrivacyFloor;
}
