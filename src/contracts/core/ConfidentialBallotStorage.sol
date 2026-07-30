// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { IConfidentialBallotCore } from "../interfaces/IConfidentialBallotCore.sol";
import { ConfidentialBallotValidation } from "../libraries/ConfidentialBallotValidation.sol";
import {
    BallotReceipt,
    BallotRecord,
    DetailedState,
    Result,
    StoredBallotState
} from "../types/ConfidentialGovernanceTypes.sol";
import { EncryptedBallot, EncryptedTotals } from "../types/ConfidentialNoxTypes.sol";
import { ebool } from "encrypted-types/EncryptedTypes.sol";

abstract contract ConfidentialBallotStorage is IConfidentialBallotCore {
    mapping(bytes32 ballotId => BallotRecord record) internal _ballots;
    mapping(bytes32 ballotId => bytes config) internal _ballotEligibilityConfigs;
    mapping(bytes32 ballotId => Result outcome) internal _ballotResults;
    mapping(bytes32 ballotId => mapping(address voter => BallotReceipt voterReceipt)) internal
        _ballotReceipts;
    mapping(bytes32 ballotId => mapping(address voter => EncryptedBallot encryptedBallot)) internal
        _encryptedBallots;
    mapping(bytes32 ballotId => EncryptedTotals encryptedTotals) internal _encryptedTotals;
    mapping(bytes32 ballotId => ebool verdict) internal _expectedVerdicts;

    function ballot(bytes32 ballotId) external view returns (BallotRecord memory) {
        return _ballots[ballotId];
    }

    function eligibilityConfig(bytes32 ballotId) external view returns (bytes memory) {
        return _ballotEligibilityConfigs[ballotId];
    }

    function detailedState(bytes32 ballotId) external view returns (DetailedState) {
        BallotRecord storage record = _ballots[ballotId];
        if (record.storedState == StoredBallotState.None) return DetailedState.Uninitialized;
        return ConfidentialBallotValidation.detailedState(record, _hostAddress());
    }

    function result(bytes32 ballotId) external view returns (Result) {
        return _ballotResults[ballotId];
    }

    function receipt(bytes32 ballotId, address voter) external view returns (BallotReceipt memory) {
        return _ballotReceipts[ballotId][voter];
    }

    function expectedVerdictHandle(bytes32 ballotId) external view returns (bytes32) {
        return ebool.unwrap(_expectedVerdicts[ballotId]);
    }

    function _hostAddress() internal view virtual returns (address);
}
