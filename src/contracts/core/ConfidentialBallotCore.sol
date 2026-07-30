// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { ConfidentialBallotHashing } from "../libraries/ConfidentialBallotHashing.sol";
import { ConfidentialBallotValidation } from "../libraries/ConfidentialBallotValidation.sol";
import { ConfidentialGovernanceVersion } from "../libraries/ConfidentialGovernanceVersion.sol";
import {
    BallotAlreadyExists,
    DuplicateEligibilityStrategy,
    InvalidEligibilityStrategyAddress,
    InvalidHostAddress,
    InvalidPrivacyFloor,
    OnlyHost,
    UnknownBallot,
    WrongBallotState
} from "../types/ConfidentialGovernanceErrors.sol";
import {
    BallotRecord,
    DetailedState,
    RegisterBallotParams,
    Result,
    StoredBallotState
} from "../types/ConfidentialGovernanceTypes.sol";
import { ConfidentialBallotTally } from "./ConfidentialBallotTally.sol";

contract ConfidentialBallotCore is ConfidentialBallotTally {
    address public immutable override host;
    address public immutable firstEligibilityStrategy;
    address public immutable secondEligibilityStrategy;
    uint32 public immutable organizationMinimumPrivacyFloor;

    modifier onlyHost() {
        if (msg.sender != host) revert OnlyHost(msg.sender);
        _;
    }

    constructor(
        address host_,
        address firstStrategy_,
        address secondStrategy_,
        uint32 minimumPrivacyFloor_
    ) {
        if (host_ == address(0)) revert InvalidHostAddress();
        if (firstStrategy_ == address(0)) revert InvalidEligibilityStrategyAddress(0);
        if (secondStrategy_ == address(0)) revert InvalidEligibilityStrategyAddress(1);
        if (firstStrategy_ == secondStrategy_) {
            revert DuplicateEligibilityStrategy(firstStrategy_);
        }
        uint32 absoluteMinimum = ConfidentialGovernanceVersion.ABSOLUTE_MINIMUM_PRIVACY_FLOOR;
        if (minimumPrivacyFloor_ < absoluteMinimum) {
            revert InvalidPrivacyFloor(minimumPrivacyFloor_, absoluteMinimum);
        }

        host = host_;
        firstEligibilityStrategy = firstStrategy_;
        secondEligibilityStrategy = secondStrategy_;
        organizationMinimumPrivacyFloor = minimumPrivacyFloor_;
    }

    function registerBallot(RegisterBallotParams calldata params)
        external
        onlyHost
        returns (bytes32 ballotId)
    {
        bytes32 clockModeHash = ConfidentialBallotValidation.validateRegistration(
            params,
            host,
            firstEligibilityStrategy,
            secondEligibilityStrategy,
            organizationMinimumPrivacyFloor
        );

        bytes32 committedConfigHash = ConfidentialBallotHashing.configHash(params, clockModeHash);
        ballotId = ConfidentialBallotHashing.ballotId(
            block.chainid, address(this), host, params, committedConfigHash
        );
        if (_ballots[ballotId].storedState != StoredBallotState.None) {
            revert BallotAlreadyExists(ballotId);
        }

        _ballots[ballotId] = BallotRecord({
            hostProposalId: params.hostProposalId,
            actionHash: params.actionHash,
            configHash: committedConfigHash,
            clockModeHash: clockModeHash,
            eligibilityStrategy: params.eligibilityStrategy,
            snapshot: params.snapshot,
            voteStart: params.voteStart,
            voteEnd: params.voteEnd,
            recordedWeight: 0,
            privacyFloor: params.privacyFloor,
            recordedVoters: 0,
            maxReplacements: params.maxReplacements,
            storedState: StoredBallotState.Active
        });
        _ballotEligibilityConfigs[ballotId] = params.eligibilityConfig;

        emit BallotRegistered(
            ballotId,
            params.hostProposalId,
            params.actionHash,
            committedConfigHash,
            params.eligibilityStrategy,
            params.snapshot,
            params.voteStart,
            params.voteEnd,
            params.privacyFloor,
            params.maxReplacements
        );
    }

    function cancel(bytes32 ballotId) external onlyHost {
        BallotRecord storage record = _ballots[ballotId];
        if (record.storedState == StoredBallotState.None) revert UnknownBallot(ballotId);

        DetailedState currentState = ConfidentialBallotValidation.detailedState(record, host);
        if (currentState != DetailedState.Scheduled) {
            revert WrongBallotState(ballotId, DetailedState.Scheduled, currentState);
        }

        record.storedState = StoredBallotState.Canceled;
        _ballotResults[ballotId] = Result.Canceled;
        emit BallotCanceled(ballotId);
    }

    function computeConfigHash(RegisterBallotParams calldata params)
        external
        view
        returns (bytes32)
    {
        return ConfidentialBallotHashing.configHash(
            params, ConfidentialBallotValidation.currentClockModeHash(host)
        );
    }

    function computeBallotId(RegisterBallotParams calldata params) external view returns (bytes32) {
        bytes32 committedConfigHash = ConfidentialBallotHashing.configHash(
            params, ConfidentialBallotValidation.currentClockModeHash(host)
        );
        return ConfidentialBallotHashing.ballotId(
            block.chainid, address(this), host, params, committedConfigHash
        );
    }

    function _hostAddress() internal view override returns (address) {
        return host;
    }
}
