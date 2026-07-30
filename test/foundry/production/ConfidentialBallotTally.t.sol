// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Vm } from "forge-std/Vm.sol";
import {
    INoxCompute
} from "@iexec-nox/nox-protocol-contracts/contracts/interfaces/INoxCompute.sol";
import { Nox } from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import { TEEType } from "@iexec-nox/nox-protocol-contracts/contracts/utils/TypeUtils.sol";
import {
    UnknownBallot,
    WrongBallotState
} from "../../../src/contracts/types/ConfidentialGovernanceErrors.sol";
import {
    DetailedState,
    Result
} from "../../../src/contracts/types/ConfidentialGovernanceTypes.sol";
import { TallyFixture } from "./fixtures/TallyFixtures.sol";

contract ConfidentialBallotTallyTest is TallyFixture {
    bytes32 private constant ALLOWED_EVENT = keccak256("Allowed(address,address,bytes32)");
    bytes32 private constant VIEWER_ADDED_EVENT = keccak256("ViewerAdded(address,address,bytes32)");
    bytes32 private constant PUBLIC_DECRYPTION_EVENT =
        keccak256("MarkedAsPubliclyDecryptable(address,bytes32)");

    function testBelowFloorWithholdsWithoutTouchingNox() external {
        _castVoters(3);
        host.setClock(201);
        vm.recordLogs();
        vm.prank(KEEPER);
        core.requestTally(ballotId);
        Vm.Log[] memory entries = vm.getRecordedLogs();

        assertEq(uint8(core.detailedState(ballotId)), uint8(DetailedState.Withheld));
        assertEq(uint8(core.result(ballotId)), uint8(Result.Withheld));
        assertEq(core.expectedVerdictHandle(ballotId), bytes32(0));
        for (uint256 i = 0; i < entries.length; i++) {
            assertNotEq(entries[i].emitter, NOX_COMPUTE);
        }
    }

    function testPermissionlessTallyPublishesOnlyOneExpectedVerdictHandle() external {
        _requestTallyWithFloorMet();
        bytes32 expectedVerdict = core.expectedVerdictHandle(ballotId);

        assertNotEq(expectedVerdict, bytes32(0));
        assertEq(uint8(expectedVerdict[5]), uint8(TEEType.Bool));
        assertEq(uint8(core.detailedState(ballotId)), uint8(DetailedState.TallyPending));
        assertEq(uint8(core.result(ballotId)), uint8(Result.None));
        assertTrue(noxCompute.isPubliclyDecryptable(expectedVerdict));
    }

    function testTallyAclMarksOnlyExpectedVerdictPubliclyDecryptable() external {
        _castVoters(4);
        host.setClock(201);
        vm.recordLogs();
        vm.prank(KEEPER);
        core.requestTally(ballotId);
        Vm.Log[] memory entries = vm.getRecordedLogs();
        bytes32 expectedVerdict = core.expectedVerdictHandle(ballotId);
        uint256 publicEvents;
        uint256 allowedEvents;

        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].emitter != NOX_COMPUTE) continue;
            bytes32 signature = entries[i].topics[0];
            assertNotEq(signature, VIEWER_ADDED_EVENT);
            if (signature == PUBLIC_DECRYPTION_EVENT) {
                publicEvents += 1;
                assertEq(address(uint160(uint256(entries[i].topics[1]))), address(core));
                assertEq(entries[i].topics[2], expectedVerdict);
            }
            if (signature != ALLOWED_EVENT) continue;

            allowedEvents += 1;
            assertEq(address(uint160(uint256(entries[i].topics[1]))), address(core));
            assertEq(address(uint160(uint256(entries[i].topics[2]))), address(core));
            bytes32 handle = entries[i].topics[3];
            assertTrue(noxCompute.isAllowed(handle, address(core)));
            assertFalse(noxCompute.isAllowed(handle, KEEPER));
            if (handle != expectedVerdict) {
                assertFalse(noxCompute.isPubliclyDecryptable(handle));
            }
        }
        assertGt(allowedEvents, 0);
        assertEq(publicEvents, 1);
    }

    function testRejectsTallyBeforeCloseUnknownAndDuplicate() external {
        vm.expectRevert(
            abi.encodeWithSelector(
                WrongBallotState.selector, ballotId, DetailedState.Closed, DetailedState.Open
            )
        );
        core.requestTally(ballotId);

        bytes32 unknown = keccak256("unknown");
        vm.expectRevert(abi.encodeWithSelector(UnknownBallot.selector, unknown));
        core.requestTally(unknown);

        _requestTallyWithFloorMet();
        vm.expectRevert(
            abi.encodeWithSelector(
                WrongBallotState.selector,
                ballotId,
                DetailedState.Closed,
                DetailedState.TallyPending
            )
        );
        core.requestTally(ballotId);
    }

    function testFinalizesStoredVerdictEvidenceAsPassedOrRejected() external {
        _requestTallyWithFloorMet();
        bytes32 expectedVerdict = core.expectedVerdictHandle(ballotId);
        core.finalize(ballotId, _decryptionProof(expectedVerdict, hex"01", GATEWAY_PRIVATE_KEY));
        assertEq(uint8(core.detailedState(ballotId)), uint8(DetailedState.Passed));
        assertEq(uint8(core.result(ballotId)), uint8(Result.Passed));
    }

    function testFinalizesCanonicalFalseEvidenceAsRejected() external {
        _requestTallyWithFloorMet();
        bytes32 expectedVerdict = core.expectedVerdictHandle(ballotId);
        core.finalize(ballotId, _decryptionProof(expectedVerdict, hex"00", GATEWAY_PRIVATE_KEY));
        assertEq(uint8(core.detailedState(ballotId)), uint8(DetailedState.Rejected));
        assertEq(uint8(core.result(ballotId)), uint8(Result.Rejected));
    }

    function testRejectsWrongSignerHandleAndMalformedBooleanEvidence() external {
        _requestTallyWithFloorMet();
        bytes32 expectedVerdict = core.expectedVerdictHandle(ballotId);

        bytes memory proof = _decryptionProof(expectedVerdict, hex"01", 0xCAFE);
        vm.expectPartialRevert(INoxCompute.InvalidProof.selector);
        core.finalize(ballotId, proof);

        proof = _decryptionProof(keccak256("wrong-handle"), hex"01", GATEWAY_PRIVATE_KEY);
        vm.expectPartialRevert(INoxCompute.InvalidProof.selector);
        core.finalize(ballotId, proof);

        proof = _decryptionProof(expectedVerdict, hex"0001", GATEWAY_PRIVATE_KEY);
        vm.expectRevert(abi.encodeWithSelector(Nox.MalformedDecryptedData.selector, hex"0001"));
        core.finalize(ballotId, proof);

        proof = _decryptionProof(expectedVerdict, hex"02", GATEWAY_PRIVATE_KEY);
        vm.expectRevert(abi.encodeWithSelector(Nox.MalformedDecryptedData.selector, hex"02"));
        core.finalize(ballotId, proof);
        assertEq(uint8(core.detailedState(ballotId)), uint8(DetailedState.TallyPending));
        assertEq(uint8(core.result(ballotId)), uint8(Result.None));
    }

    function testRejectsFinalizationBeforeRequestUnknownAndReplay() external {
        host.setClock(201);
        vm.expectRevert(
            abi.encodeWithSelector(
                WrongBallotState.selector,
                ballotId,
                DetailedState.TallyPending,
                DetailedState.Closed
            )
        );
        core.finalize(ballotId, "");

        bytes32 unknown = keccak256("unknown-finalize");
        vm.expectRevert(abi.encodeWithSelector(UnknownBallot.selector, unknown));
        core.finalize(unknown, "");

        _requestTallyWithFloorMet();
        bytes32 expectedVerdict = core.expectedVerdictHandle(ballotId);
        bytes memory proof = _decryptionProof(expectedVerdict, hex"01", GATEWAY_PRIVATE_KEY);
        core.finalize(ballotId, proof);
        vm.expectRevert(
            abi.encodeWithSelector(
                WrongBallotState.selector,
                ballotId,
                DetailedState.TallyPending,
                DetailedState.Passed
            )
        );
        core.finalize(ballotId, proof);
    }
}
