// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import {
    INoxCompute
} from "@iexec-nox/nox-protocol-contracts/contracts/interfaces/INoxCompute.sol";
import { Nox } from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import { TEEType } from "@iexec-nox/nox-protocol-contracts/contracts/utils/TypeUtils.sol";
import { externalEuint16 } from "encrypted-types/EncryptedTypes.sol";
import { ConfidentialBallotCore } from "../../../src/contracts/core/ConfidentialBallotCore.sol";
import {
    BallotReceipt,
    DetailedState,
    RegisterBallotParams,
    Result
} from "../../../src/contracts/types/ConfidentialGovernanceTypes.sol";
import { HostClockFixture } from "./fixtures/CoreFixtures.sol";
import { TallyFixture } from "./fixtures/TallyFixtures.sol";

contract ConfidentialBallotProofNegativeMatrixTest is TallyFixture {
    function testRejectsCompleteLocalVerdictProofMatrixWithoutMutation() external {
        _requestTallyWithFloorMet();
        bytes32 verdictHandle = core.expectedVerdictHandle(ballotId);
        assertEq(uint8(verdictHandle[5]), uint8(TEEType.Bool));

        vm.expectPartialRevert(INoxCompute.InvalidProof.selector);
        core.finalize(ballotId, hex"");

        bytes memory mutated = _decryptionProof(verdictHandle, hex"01", GATEWAY_PRIVATE_KEY);
        mutated[65] = bytes1(0x00);
        vm.expectPartialRevert(INoxCompute.InvalidProof.selector);
        core.finalize(ballotId, mutated);

        bytes memory wrongSigner = _decryptionProof(verdictHandle, hex"01", 0xCAFE);
        vm.expectPartialRevert(INoxCompute.InvalidProof.selector);
        core.finalize(ballotId, wrongSigner);

        bytes memory wrongVersion = _decryptionProofForDomain(
            verdictHandle, hex"01", GATEWAY_PRIVATE_KEY, block.chainid, NOX_COMPUTE, "2"
        );
        vm.expectPartialRevert(INoxCompute.InvalidProof.selector);
        core.finalize(ballotId, wrongVersion);

        bytes memory wrongVerifyingContract = _decryptionProofForDomain(
            verdictHandle, hex"01", GATEWAY_PRIVATE_KEY, block.chainid, address(0xBAD), "1"
        );
        vm.expectPartialRevert(INoxCompute.InvalidProof.selector);
        core.finalize(ballotId, wrongVerifyingContract);

        bytes memory wrongHandle =
            _decryptionProof(keccak256("foreign-verdict"), hex"01", GATEWAY_PRIVATE_KEY);
        vm.expectPartialRevert(INoxCompute.InvalidProof.selector);
        core.finalize(ballotId, wrongHandle);

        bytes memory wrongLength = _decryptionProof(verdictHandle, hex"0001", GATEWAY_PRIVATE_KEY);
        vm.expectRevert(abi.encodeWithSelector(Nox.MalformedDecryptedData.selector, hex"0001"));
        core.finalize(ballotId, wrongLength);

        bytes memory wrongValue = _decryptionProof(verdictHandle, hex"02", GATEWAY_PRIVATE_KEY);
        vm.expectRevert(abi.encodeWithSelector(Nox.MalformedDecryptedData.selector, hex"02"));
        core.finalize(ballotId, wrongValue);

        _assertPending(core, ballotId, verdictHandle);
        core.finalize(ballotId, _decryptionProof(verdictHandle, hex"01", GATEWAY_PRIVATE_KEY));
        assertEq(uint8(core.detailedState(ballotId)), uint8(DetailedState.Passed));
    }

    function testRejectsVerdictProofAcrossProposalsWithoutMutation() external {
        bytes32 secondBallotId =
            host.register(_params(keccak256("second-proposal"), keccak256("second-action")));
        _castSameInputsAcrossProposals(secondBallotId);
        host.setClock(201);
        core.requestTally(ballotId);
        core.requestTally(secondBallotId);

        bytes32 firstVerdict = core.expectedVerdictHandle(ballotId);
        bytes32 secondVerdict = core.expectedVerdictHandle(secondBallotId);
        assertNotEq(firstVerdict, secondVerdict);
        bytes memory firstProof = _decryptionProof(firstVerdict, hex"01", GATEWAY_PRIVATE_KEY);
        bytes memory secondProof = _decryptionProof(secondVerdict, hex"01", GATEWAY_PRIVATE_KEY);

        vm.expectPartialRevert(INoxCompute.InvalidProof.selector);
        core.finalize(secondBallotId, firstProof);
        vm.expectPartialRevert(INoxCompute.InvalidProof.selector);
        core.finalize(ballotId, secondProof);
        _assertPending(core, ballotId, firstVerdict);
        _assertPending(core, secondBallotId, secondVerdict);

        core.finalize(ballotId, firstProof);
        core.finalize(secondBallotId, secondProof);
    }

    function testRejectsVerdictProofAcrossHostsWithoutMutation() external {
        (HostClockFixture otherHost, ConfidentialBallotCore otherCore, bytes32 otherBallotId) =
            _otherHostBallot();
        _castSameInputsAcrossHosts(otherCore, otherBallotId);
        host.setClock(201);
        otherHost.setClock(201);
        core.requestTally(ballotId);
        otherCore.requestTally(otherBallotId);

        bytes32 firstVerdict = core.expectedVerdictHandle(ballotId);
        bytes32 otherVerdict = otherCore.expectedVerdictHandle(otherBallotId);
        assertNotEq(firstVerdict, otherVerdict);
        bytes memory firstProof = _decryptionProof(firstVerdict, hex"01", GATEWAY_PRIVATE_KEY);
        bytes memory otherProof = _decryptionProof(otherVerdict, hex"01", GATEWAY_PRIVATE_KEY);

        vm.expectPartialRevert(INoxCompute.InvalidProof.selector);
        otherCore.finalize(otherBallotId, firstProof);
        vm.expectPartialRevert(INoxCompute.InvalidProof.selector);
        core.finalize(ballotId, otherProof);
        _assertPending(core, ballotId, firstVerdict);
        _assertPending(otherCore, otherBallotId, otherVerdict);

        core.finalize(ballotId, firstProof);
        otherCore.finalize(otherBallotId, otherProof);
    }

    function testRejectsVerdictProofAcrossChainsWithoutMutation() external {
        _requestTallyWithFloorMet();
        bytes32 verdictHandle = core.expectedVerdictHandle(ballotId);
        bytes memory foreignProof = _decryptionProofForDomain(
            verdictHandle, hex"01", GATEWAY_PRIVATE_KEY, block.chainid + 1, NOX_COMPUTE, "1"
        );

        vm.expectPartialRevert(INoxCompute.InvalidProof.selector);
        core.finalize(ballotId, foreignProof);
        _assertPending(core, ballotId, verdictHandle);

        core.finalize(ballotId, _decryptionProof(verdictHandle, hex"01", GATEWAY_PRIVATE_KEY));
    }

    function testRejectsInputProofAcrossHostsAndChainsWithoutRecording() external {
        (, ConfidentialBallotCore otherCore, bytes32 otherBallotId) = _otherHostBallot();
        address voter = voters[0];
        (externalEuint16 handle, bytes memory proof) = _encryptedInputFor(
            voter, address(core), keccak256("first-core-proof"), block.chainid, block.chainid
        );

        vm.expectPartialRevert(INoxCompute.InvalidProof.selector);
        vm.prank(voter);
        otherCore.castVote(otherBallotId, 1, handle, proof, "");
        _assertUnrecorded(otherCore, otherBallotId, voter);

        uint256 foreignChainId = block.chainid + 1;
        (handle, proof) = _encryptedInputFor(
            voter, address(core), keccak256("foreign-chain-proof"), foreignChainId, foreignChainId
        );
        vm.expectPartialRevert(INoxCompute.InvalidProof.selector);
        vm.prank(voter);
        core.castVote(ballotId, 1, handle, proof, "");
        _assertUnrecorded(core, ballotId, voter);
    }

    function _otherHostBallot()
        private
        returns (
            HostClockFixture otherHost,
            ConfidentialBallotCore otherCore,
            bytes32 otherBallotId
        )
    {
        otherHost = new HostClockFixture(address(votesStrategy), address(merkleStrategy), 4);
        otherCore = otherHost.confidentialCore();
        otherHost.setClock(99);
        otherBallotId =
            otherHost.register(_params(keccak256("tally-proposal"), keccak256("tally-action")));
        otherHost.setClock(101);
        otherHost.setQuorum(7);
        assertNotEq(otherBallotId, ballotId);
    }

    function _castAll(ConfidentialBallotCore targetCore, bytes32 targetBallotId, bytes32 seed)
        private
    {
        for (uint256 i = 0; i < voters.length; ++i) {
            (externalEuint16 handle, bytes memory proof) = _encryptedInputFor(
                voters[i],
                address(targetCore),
                keccak256(abi.encode(seed, i)),
                block.chainid,
                block.chainid
            );
            vm.prank(voters[i]);
            targetCore.castVote(targetBallotId, 1, handle, proof, "");
        }
    }

    function _castSameInputsAcrossProposals(bytes32 secondBallotId) private {
        for (uint256 i = 0; i < voters.length; ++i) {
            (externalEuint16 handle, bytes memory proof) = _encryptedInputFor(
                voters[i],
                address(core),
                keccak256(abi.encode("shared-proposal-input", i)),
                block.chainid,
                block.chainid
            );
            vm.prank(voters[i]);
            core.castVote(ballotId, 1, handle, proof, "");
            vm.prank(voters[i]);
            core.castVote(secondBallotId, 1, handle, proof, "");
        }
    }

    function _castSameInputsAcrossHosts(ConfidentialBallotCore otherCore, bytes32 otherBallotId)
        private
    {
        bytes32 sharedHandleDomain = keccak256("shared-host-handle-domain");
        for (uint256 i = 0; i < voters.length; ++i) {
            bytes32 seed = keccak256(abi.encode("shared-host-input", i));
            (externalEuint16 firstHandle, bytes memory firstProof) = _encryptedInputForHandleDomain(
                voters[i], address(core), seed, sharedHandleDomain, block.chainid, block.chainid
            );
            (externalEuint16 otherHandle, bytes memory otherProof) = _encryptedInputForHandleDomain(
                voters[i],
                address(otherCore),
                seed,
                sharedHandleDomain,
                block.chainid,
                block.chainid
            );
            assertEq(externalEuint16.unwrap(firstHandle), externalEuint16.unwrap(otherHandle));
            vm.prank(voters[i]);
            core.castVote(ballotId, 1, firstHandle, firstProof, "");
            vm.prank(voters[i]);
            otherCore.castVote(otherBallotId, 1, otherHandle, otherProof, "");
        }
    }

    function _assertPending(
        ConfidentialBallotCore targetCore,
        bytes32 targetBallotId,
        bytes32 expectedVerdict
    ) private view {
        assertEq(uint8(targetCore.detailedState(targetBallotId)), uint8(DetailedState.TallyPending));
        assertEq(uint8(targetCore.result(targetBallotId)), uint8(Result.None));
        assertEq(targetCore.expectedVerdictHandle(targetBallotId), expectedVerdict);
    }

    function _assertUnrecorded(
        ConfidentialBallotCore targetCore,
        bytes32 targetBallotId,
        address voter
    ) private view {
        BallotReceipt memory voterReceipt = targetCore.receipt(targetBallotId, voter);
        assertFalse(voterReceipt.recorded);
        assertEq(voterReceipt.sequence, 0);
        assertEq(targetCore.ballot(targetBallotId).recordedVoters, 0);
    }

    function _params(bytes32 proposalId, bytes32 actionHash)
        private
        view
        returns (RegisterBallotParams memory params)
    {
        params = RegisterBallotParams({
            hostProposalId: proposalId,
            actionHash: actionHash,
            eligibilityStrategy: address(votesStrategy),
            eligibilityConfig: abi.encode(address(token)),
            snapshot: 10,
            voteStart: 100,
            voteEnd: 200,
            privacyFloor: 4,
            maxReplacements: 2
        });
    }
}
