// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { IConfidentialHost } from "../interfaces/IConfidentialHost.sol";
import { IEligibilityStrategy } from "../interfaces/IEligibilityStrategy.sol";
import {
    ClockModeChanged,
    InvalidActionHash,
    InvalidClockMode,
    InvalidEligibilityConfig,
    InvalidPrivacyFloor,
    InvalidProposalId,
    InvalidReplacementLimit,
    InvalidVotingWindow,
    PrivacyFloorExceedsEligibility,
    UnsupportedEligibilityStrategy,
    VotingAlreadyEnded
} from "../types/ConfidentialGovernanceErrors.sol";
import {
    BallotRecord,
    DetailedState,
    RegisterBallotParams,
    StoredBallotState
} from "../types/ConfidentialGovernanceTypes.sol";

library ConfidentialBallotValidation {
    function validateRegistration(
        RegisterBallotParams calldata params,
        address host,
        address firstStrategy,
        address secondStrategy,
        uint32 minimumPrivacyFloor
    ) internal view returns (bytes32 clockModeHash) {
        clockModeHash = currentClockModeHash(host);
        if (params.hostProposalId == bytes32(0)) revert InvalidProposalId();
        if (params.actionHash == bytes32(0)) revert InvalidActionHash();
        if (params.eligibilityConfig.length == 0) revert InvalidEligibilityConfig();
        if (
            params.eligibilityStrategy != firstStrategy
                && params.eligibilityStrategy != secondStrategy
        ) revert UnsupportedEligibilityStrategy(params.eligibilityStrategy);
        if (params.voteStart >= params.voteEnd) {
            revert InvalidVotingWindow(params.voteStart, params.voteEnd);
        }

        uint48 currentClock = IConfidentialHost(host).confidentialClock();
        if (currentClock >= params.voteEnd) {
            revert VotingAlreadyEnded(currentClock, params.voteEnd);
        }
        if (params.privacyFloor < minimumPrivacyFloor) {
            revert InvalidPrivacyFloor(params.privacyFloor, minimumPrivacyFloor);
        }
        if (params.maxReplacements < 1 || params.maxReplacements > 2) {
            revert InvalidReplacementLimit(params.maxReplacements);
        }

        uint32 eligibleCount = IEligibilityStrategy(params.eligibilityStrategy)
            .validateConfig(params.eligibilityConfig);
        if (eligibleCount != 0 && params.privacyFloor > eligibleCount) {
            revert PrivacyFloorExceedsEligibility(params.privacyFloor, eligibleCount);
        }
    }

    function detailedState(BallotRecord storage record, address host)
        internal
        view
        returns (DetailedState)
    {
        if (record.storedState == StoredBallotState.Canceled) return DetailedState.Canceled;
        if (record.storedState == StoredBallotState.TallyPending) {
            return DetailedState.TallyPending;
        }
        if (record.storedState == StoredBallotState.Withheld) return DetailedState.Withheld;
        if (record.storedState == StoredBallotState.Rejected) return DetailedState.Rejected;
        if (record.storedState == StoredBallotState.Passed) return DetailedState.Passed;

        bytes32 actualClockModeHash = currentClockModeHash(host);
        if (actualClockModeHash != record.clockModeHash) {
            revert ClockModeChanged(record.clockModeHash, actualClockModeHash);
        }
        uint48 currentClock = IConfidentialHost(host).confidentialClock();
        if (currentClock <= record.voteStart) return DetailedState.Scheduled;
        if (currentClock <= record.voteEnd) return DetailedState.Open;
        return DetailedState.Closed;
    }

    function currentClockModeHash(address host) internal view returns (bytes32) {
        bytes memory clockMode = bytes(IConfidentialHost(host).confidentialClockMode());
        if (clockMode.length == 0) revert InvalidClockMode();
        return keccak256(clockMode);
    }
}
