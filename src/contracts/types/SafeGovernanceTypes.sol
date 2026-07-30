// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

struct SafeAction {
    address to;
    uint256 value;
    bytes data;
}

struct SafeBallotConfig {
    address eligibilityStrategy;
    bytes eligibilityConfig;
    uint48 snapshot;
    uint48 voteStart;
    uint48 voteEnd;
    uint32 privacyFloor;
    uint8 maxReplacements;
    uint256 governanceQuorum;
}

struct SafeProposalRecord {
    bytes32 ballotId;
    bytes32 actionHash;
    uint256 governanceQuorum;
    bool executed;
}
