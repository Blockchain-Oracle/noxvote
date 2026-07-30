// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import {
    BallotReceipt,
    BallotRecord,
    DetailedState,
    RegisterBallotParams,
    Result
} from "../types/ConfidentialGovernanceTypes.sol";
import { externalEuint16 } from "encrypted-types/EncryptedTypes.sol";

interface IConfidentialBallotCore {
    event BallotRegistered(
        bytes32 indexed ballotId,
        bytes32 indexed hostProposalId,
        bytes32 indexed actionHash,
        bytes32 configHash,
        address eligibilityStrategy,
        uint48 snapshot,
        uint48 voteStart,
        uint48 voteEnd,
        uint32 privacyFloor,
        uint8 maxReplacements
    );
    event BallotCanceled(bytes32 indexed ballotId);
    event VoteRecorded(
        bytes32 indexed ballotId,
        address indexed voter,
        uint64 indexed sequence,
        bool replacement,
        uint256 weight,
        uint32 recordedVoters
    );
    event TallyWithheld(bytes32 indexed ballotId, uint32 recordedVoters, uint32 privacyFloor);
    event TallyRequested(bytes32 indexed ballotId, bytes32 indexed expectedVerdictHandle);
    event BallotFinalized(bytes32 indexed ballotId, Result result);

    function host() external view returns (address);

    function registerBallot(RegisterBallotParams calldata params)
        external
        returns (bytes32 ballotId);

    function cancel(bytes32 ballotId) external;

    function castVote(
        bytes32 ballotId,
        uint64 sequence,
        externalEuint16 choice,
        bytes calldata handleProof,
        bytes calldata eligibilityProof
    ) external;

    function requestTally(bytes32 ballotId) external;

    function finalize(bytes32 ballotId, bytes calldata decryptionProof) external;

    function computeConfigHash(RegisterBallotParams calldata params) external view returns (bytes32);

    function computeBallotId(RegisterBallotParams calldata params) external view returns (bytes32);

    function ballot(bytes32 ballotId) external view returns (BallotRecord memory);

    function eligibilityConfig(bytes32 ballotId) external view returns (bytes memory);

    function detailedState(bytes32 ballotId) external view returns (DetailedState);

    function result(bytes32 ballotId) external view returns (Result);

    function receipt(bytes32 ballotId, address voter) external view returns (BallotReceipt memory);

    function expectedVerdictHandle(bytes32 ballotId) external view returns (bytes32);
}
