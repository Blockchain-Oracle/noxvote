// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { TimelockController } from "@openzeppelin/contracts/governance/TimelockController.sol";
import { IVotes } from "@openzeppelin/contracts/governance/utils/IVotes.sol";

enum ConfidentialProposalState {
    Uninitialized,
    Scheduled,
    Open,
    Closed,
    TallyPending,
    Withheld,
    Rejected,
    Passed,
    Queued,
    Executed,
    Canceled
}

struct ConfidentialGovernorConfig {
    string name;
    IVotes token;
    TimelockController timelock;
    uint48 initialVotingDelay;
    uint32 initialVotingPeriod;
    uint256 initialProposalThreshold;
    uint256 initialQuorumNumerator;
    address ivotesStrategy;
    address merkleStrategy;
    uint32 minimumPrivacyFloor;
}
