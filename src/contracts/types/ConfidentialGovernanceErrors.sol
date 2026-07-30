// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { DetailedState } from "./ConfidentialGovernanceTypes.sol";

error InvalidHostAddress();
error InvalidEligibilityStrategyAddress(uint8 position);
error DuplicateEligibilityStrategy(address strategy);
error OnlyHost(address caller);
error InvalidProposalId();
error InvalidActionHash();
error InvalidEligibilityConfig();
error UnsupportedEligibilityStrategy(address strategy);
error InvalidClockMode();
error ClockModeChanged(bytes32 expected, bytes32 actual);
error InvalidVotingWindow(uint48 voteStart, uint48 voteEnd);
error VotingAlreadyEnded(uint48 currentClock, uint48 voteEnd);
error InvalidPrivacyFloor(uint32 provided, uint32 minimum);
error PrivacyFloorExceedsEligibility(uint32 provided, uint32 eligibleCount);
error InvalidReplacementLimit(uint8 provided);
error BallotAlreadyExists(bytes32 ballotId);
error UnknownBallot(bytes32 ballotId);
error WrongBallotState(bytes32 ballotId, DetailedState expected, DetailedState actual);
error WrongBallotSequence(bytes32 ballotId, address voter, uint64 expected, uint64 provided);
error ReplacementLimitReached(bytes32 ballotId, address voter, uint8 maximum);
error ReplacementEligibilityProofNotAllowed(uint256 actualLength);
