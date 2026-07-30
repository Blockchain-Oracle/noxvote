// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { IConfidentialHost } from "../interfaces/IConfidentialHost.sol";
import { ConfidentialBallotValidation } from "../libraries/ConfidentialBallotValidation.sol";
import { ConfidentialTallyNox } from "../libraries/ConfidentialTallyNox.sol";
import { UnknownBallot, WrongBallotState } from "../types/ConfidentialGovernanceErrors.sol";
import {
    BallotRecord,
    DetailedState,
    Result,
    StoredBallotState
} from "../types/ConfidentialGovernanceTypes.sol";
import { ebool } from "encrypted-types/EncryptedTypes.sol";
import { ConfidentialBallotCasting } from "./ConfidentialBallotCasting.sol";

abstract contract ConfidentialBallotTally is ConfidentialBallotCasting {
    function requestTally(bytes32 ballotId) external {
        BallotRecord storage record = _knownBallot(ballotId);
        DetailedState currentState =
            ConfidentialBallotValidation.detailedState(record, _hostAddress());
        if (currentState != DetailedState.Closed) {
            revert WrongBallotState(ballotId, DetailedState.Closed, currentState);
        }

        if (record.recordedVoters < record.privacyFloor) {
            record.storedState = StoredBallotState.Withheld;
            _ballotResults[ballotId] = Result.Withheld;
            emit TallyWithheld(ballotId, record.recordedVoters, record.privacyFloor);
            return;
        }

        uint256 governanceQuorum = IConfidentialHost(_hostAddress())
            .governanceQuorum(record.hostProposalId, record.snapshot);
        ebool verdict = ConfidentialTallyNox.deriveVerdict(
            _encryptedTotals[ballotId], governanceQuorum, ballotId
        );
        _expectedVerdicts[ballotId] = verdict;
        record.storedState = StoredBallotState.TallyPending;
        emit TallyRequested(ballotId, ebool.unwrap(verdict));
    }

    function finalize(bytes32 ballotId, bytes calldata decryptionProof) external {
        BallotRecord storage record = _knownBallot(ballotId);
        DetailedState currentState =
            ConfidentialBallotValidation.detailedState(record, _hostAddress());
        if (currentState != DetailedState.TallyPending) {
            revert WrongBallotState(ballotId, DetailedState.TallyPending, currentState);
        }

        bool passed =
            ConfidentialTallyNox.publicDecrypt(_expectedVerdicts[ballotId], decryptionProof);
        Result finalResult = passed ? Result.Passed : Result.Rejected;
        _ballotResults[ballotId] = finalResult;
        record.storedState = passed ? StoredBallotState.Passed : StoredBallotState.Rejected;
        emit BallotFinalized(ballotId, finalResult);
    }

    function _knownBallot(bytes32 ballotId) private view returns (BallotRecord storage record) {
        record = _ballots[ballotId];
        if (record.storedState == StoredBallotState.None) revert UnknownBallot(ballotId);
    }
}
