// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { IEligibilityStrategy } from "../interfaces/IEligibilityStrategy.sol";
import { ConfidentialBallotNox } from "../libraries/ConfidentialBallotNox.sol";
import { ConfidentialBallotValidation } from "../libraries/ConfidentialBallotValidation.sol";
import {
    ReplacementEligibilityProofNotAllowed,
    ReplacementLimitReached,
    UnknownBallot,
    WrongBallotSequence,
    WrongBallotState
} from "../types/ConfidentialGovernanceErrors.sol";
import {
    BallotReceipt,
    BallotRecord,
    DetailedState,
    StoredBallotState
} from "../types/ConfidentialGovernanceTypes.sol";
import { externalEuint16 } from "encrypted-types/EncryptedTypes.sol";
import { ConfidentialBallotStorage } from "./ConfidentialBallotStorage.sol";

abstract contract ConfidentialBallotCasting is ConfidentialBallotStorage {
    function castVote(
        bytes32 ballotId,
        uint64 sequence,
        externalEuint16 choice,
        bytes calldata handleProof,
        bytes calldata eligibilityProof
    ) external {
        (bool replacement, uint256 weight) = _authorizeCast(ballotId, sequence, eligibilityProof);
        ConfidentialBallotNox.record(
            _encryptedBallots[ballotId][msg.sender],
            _encryptedTotals[ballotId],
            replacement,
            choice,
            handleProof,
            weight
        );
        _recordPublicReceipt(ballotId, sequence, replacement, weight);
    }

    function _authorizeCast(bytes32 ballotId, uint64 sequence, bytes calldata eligibilityProof)
        private
        view
        returns (bool replacement, uint256 weight)
    {
        BallotRecord storage record = _ballots[ballotId];
        if (record.storedState == StoredBallotState.None) revert UnknownBallot(ballotId);

        DetailedState currentState =
            ConfidentialBallotValidation.detailedState(record, _hostAddress());
        if (currentState != DetailedState.Open) {
            revert WrongBallotState(ballotId, DetailedState.Open, currentState);
        }

        BallotReceipt storage voterReceipt = _ballotReceipts[ballotId][msg.sender];
        uint64 expectedSequence = voterReceipt.sequence + 1;
        if (sequence != expectedSequence) {
            revert WrongBallotSequence(ballotId, msg.sender, expectedSequence, sequence);
        }

        replacement = voterReceipt.recorded;
        if (replacement) {
            if (voterReceipt.replacementsUsed >= record.maxReplacements) {
                revert ReplacementLimitReached(ballotId, msg.sender, record.maxReplacements);
            }
            if (eligibilityProof.length != 0) {
                revert ReplacementEligibilityProofNotAllowed(eligibilityProof.length);
            }
            weight = voterReceipt.weight;
        } else {
            weight = IEligibilityStrategy(record.eligibilityStrategy)
                .weightOf(
                    msg.sender,
                    record.snapshot,
                    _ballotEligibilityConfigs[ballotId],
                    eligibilityProof
                );
        }
    }

    function _recordPublicReceipt(
        bytes32 ballotId,
        uint64 sequence,
        bool replacement,
        uint256 weight
    ) private {
        BallotRecord storage record = _ballots[ballotId];
        BallotReceipt storage voterReceipt = _ballotReceipts[ballotId][msg.sender];
        if (replacement) {
            voterReceipt.replacementsUsed += 1;
        } else {
            voterReceipt.recorded = true;
            voterReceipt.weight = weight;
            record.recordedVoters += 1;
            record.recordedWeight += weight;
        }
        voterReceipt.sequence = sequence;
        emit VoteRecorded(
            ballotId, msg.sender, sequence, replacement, weight, record.recordedVoters
        );
    }
}
