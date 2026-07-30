// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

enum StoredBallotState {
    None,
    Active,
    TallyPending,
    Withheld,
    Rejected,
    Passed,
    Canceled
}

enum DetailedState {
    Uninitialized,
    Scheduled,
    Open,
    Closed,
    TallyPending,
    Withheld,
    Rejected,
    Passed,
    Canceled
}

enum Result {
    None,
    Withheld,
    Rejected,
    Passed,
    Canceled
}

struct RegisterBallotParams {
    bytes32 hostProposalId;
    bytes32 actionHash;
    address eligibilityStrategy;
    bytes eligibilityConfig;
    uint48 snapshot;
    uint48 voteStart;
    uint48 voteEnd;
    uint32 privacyFloor;
    uint8 maxReplacements;
}

struct BallotRecord {
    bytes32 hostProposalId;
    bytes32 actionHash;
    bytes32 configHash;
    bytes32 clockModeHash;
    address eligibilityStrategy;
    uint48 snapshot;
    uint48 voteStart;
    uint48 voteEnd;
    uint256 recordedWeight;
    uint32 privacyFloor;
    uint32 recordedVoters;
    uint8 maxReplacements;
    StoredBallotState storedState;
}

struct BallotReceipt {
    uint256 weight;
    uint64 sequence;
    uint8 replacementsUsed;
    bool recorded;
}
