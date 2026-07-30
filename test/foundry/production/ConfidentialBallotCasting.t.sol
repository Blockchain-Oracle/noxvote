// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Test } from "forge-std/Test.sol";
import { Vm } from "forge-std/Vm.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import { NoxCompute } from "@iexec-nox/nox-protocol-contracts/contracts/NoxCompute.sol";
import {
    INoxCompute
} from "@iexec-nox/nox-protocol-contracts/contracts/interfaces/INoxCompute.sol";
import { TEEType } from "@iexec-nox/nox-protocol-contracts/contracts/utils/TypeUtils.sol";
import { externalEuint16 } from "encrypted-types/EncryptedTypes.sol";
import { ConfidentialBallotCore } from "../../../src/contracts/core/ConfidentialBallotCore.sol";
import {
    IVotesSnapshotStrategy
} from "../../../src/contracts/eligibility/IVotesSnapshotStrategy.sol";
import {
    MerkleWeightedAllowlistStrategy
} from "../../../src/contracts/eligibility/MerkleWeightedAllowlistStrategy.sol";
import {
    ReplacementEligibilityProofNotAllowed,
    ReplacementLimitReached,
    WrongBallotSequence,
    WrongBallotState
} from "../../../src/contracts/types/ConfidentialGovernanceErrors.sol";
import {
    BallotReceipt,
    BallotRecord,
    DetailedState,
    RegisterBallotParams
} from "../../../src/contracts/types/ConfidentialGovernanceTypes.sol";
import { ZeroEligibilityWeight } from "../../../src/contracts/types/EligibilityErrors.sol";
import { HostClockFixture } from "./fixtures/CoreFixtures.sol";
import { VotesTokenFixture } from "./fixtures/EligibilityFixtures.sol";

contract ConfidentialBallotCastingTest is Test {
    address private constant NOX_COMPUTE = 0x75C6AF4430cc474b1bb9b8540b7E46D6f8e1C685;
    address private constant VOTER = address(0xA11CE);
    address private constant SECOND_VOTER = address(0xB0B);
    uint256 private constant GATEWAY_PRIVATE_KEY = 0xBEEF;
    bytes32 private constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 private constant ALLOWED_EVENT = keccak256("Allowed(address,address,bytes32)");
    bytes32 private constant VIEWER_ADDED_EVENT = keccak256("ViewerAdded(address,address,bytes32)");
    bytes32 private constant PUBLIC_DECRYPTION_EVENT =
        keccak256("MarkedAsPubliclyDecryptable(address,bytes32)");

    IVotesSnapshotStrategy private votesStrategy;
    MerkleWeightedAllowlistStrategy private merkleStrategy;
    VotesTokenFixture private token;
    HostClockFixture private host;
    ConfidentialBallotCore private core;
    NoxCompute private noxCompute;
    bytes32 private ballotId;

    function setUp() external {
        vm.chainId(31_337);
        vm.roll(10);
        NoxCompute implementation = new NoxCompute();
        bytes memory initData = abi.encodeCall(
            NoxCompute.initialize,
            (address(this), address(this), hex"01", vm.addr(GATEWAY_PRIVATE_KEY))
        );
        deployCodeTo(
            "ERC1967Proxy.sol:ERC1967Proxy",
            abi.encode(address(implementation), initData),
            NOX_COMPUTE
        );
        noxCompute = NoxCompute(NOX_COMPUTE);

        votesStrategy = new IVotesSnapshotStrategy();
        merkleStrategy = new MerkleWeightedAllowlistStrategy();
        token = new VotesTokenFixture();
        token.mint(VOTER, 7);
        token.mint(SECOND_VOTER, 3);
        vm.prank(VOTER);
        token.delegate(VOTER);
        vm.prank(SECOND_VOTER);
        token.delegate(SECOND_VOTER);
        vm.roll(11);

        host = new HostClockFixture(address(votesStrategy), address(merkleStrategy), 4);
        core = host.confidentialCore();
        host.setClock(99);
        ballotId = host.register(_params());
        host.setClock(101);
    }

    function testRecordsInitialBallotAndTwoReplacementsAtFixedWeight() external {
        _cast(VOTER, 1, keccak256("against"));
        _assertPublicState(1, 0, 7, 1, 7);

        vm.etch(address(token), "");
        _cast(VOTER, 2, keccak256("for"));
        _assertPublicState(2, 1, 7, 1, 7);
        _cast(VOTER, 3, keccak256("abstain"));
        _assertPublicState(3, 2, 7, 1, 7);
    }

    function testRejectsFourthOperationBeforeNox() external {
        _cast(VOTER, 1, keccak256("first"));
        _cast(VOTER, 2, keccak256("second"));
        _cast(VOTER, 3, keccak256("third"));

        vm.expectRevert(
            abi.encodeWithSelector(ReplacementLimitReached.selector, ballotId, VOTER, uint8(2))
        );
        vm.prank(VOTER);
        core.castVote(ballotId, 4, externalEuint16.wrap(bytes32(0)), "", "");
    }

    function testRejectsWrongSequenceBeforeEligibilityAndNox() external {
        vm.expectRevert(
            abi.encodeWithSelector(
                WrongBallotSequence.selector, ballotId, VOTER, uint64(1), uint64(2)
            )
        );
        vm.prank(VOTER);
        core.castVote(ballotId, 2, externalEuint16.wrap(bytes32(0)), "", hex"01");
    }

    function testRejectsIneligibleVoterBeforeNox() external {
        address outsider = address(0xBAD);
        vm.expectRevert(abi.encodeWithSelector(ZeroEligibilityWeight.selector, outsider));
        vm.prank(outsider);
        core.castVote(ballotId, 1, externalEuint16.wrap(bytes32(0)), "", "");
    }

    function testRejectsScheduledAndClosedBallotsBeforeNox() external {
        host.setClock(100);
        vm.expectRevert(
            abi.encodeWithSelector(
                WrongBallotState.selector, ballotId, DetailedState.Open, DetailedState.Scheduled
            )
        );
        vm.prank(VOTER);
        core.castVote(ballotId, 1, externalEuint16.wrap(bytes32(0)), "", "");

        host.setClock(201);
        vm.expectRevert(
            abi.encodeWithSelector(
                WrongBallotState.selector, ballotId, DetailedState.Open, DetailedState.Closed
            )
        );
        vm.prank(VOTER);
        core.castVote(ballotId, 1, externalEuint16.wrap(bytes32(0)), "", "");
    }

    function testReplacementRejectsNewEligibilityProofBeforeNox() external {
        _cast(VOTER, 1, keccak256("first"));

        vm.expectRevert(
            abi.encodeWithSelector(ReplacementEligibilityProofNotAllowed.selector, uint256(1))
        );
        vm.prank(VOTER);
        core.castVote(ballotId, 2, externalEuint16.wrap(bytes32(0)), "", hex"01");
    }

    function testNoxProofRemainsBoundToDirectWalletAndCore() external {
        (externalEuint16 handle, bytes memory wrongOwnerProof) =
            _encryptedInput(VOTER, address(core), keccak256("owner-bound"));
        vm.expectPartialRevert(INoxCompute.InvalidProof.selector);
        vm.prank(SECOND_VOTER);
        core.castVote(ballotId, 1, handle, wrongOwnerProof, "");

        (handle, wrongOwnerProof) = _encryptedInput(VOTER, address(0xBAD), keccak256("app-bound"));
        vm.expectPartialRevert(INoxCompute.InvalidProof.selector);
        vm.prank(VOTER);
        core.castVote(ballotId, 1, handle, wrongOwnerProof, "");
    }

    function testPersistsOnlyCoreAclAndNeverMarksCastGraphPubliclyDecryptable() external {
        vm.recordLogs();
        _cast(VOTER, 1, keccak256("acl-bound"));
        Vm.Log[] memory entries = vm.getRecordedLogs();
        uint256 allowedEvents;

        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].emitter != NOX_COMPUTE) continue;
            bytes32 signature = entries[i].topics[0];
            assertNotEq(signature, VIEWER_ADDED_EVENT);
            assertNotEq(signature, PUBLIC_DECRYPTION_EVENT);
            if (signature != ALLOWED_EVENT) continue;

            allowedEvents += 1;
            assertEq(address(uint160(uint256(entries[i].topics[1]))), address(core));
            assertEq(address(uint160(uint256(entries[i].topics[2]))), address(core));
            bytes32 handle = entries[i].topics[3];
            assertTrue(noxCompute.isAllowed(handle, address(core)));
            assertFalse(noxCompute.isAllowed(handle, VOTER));
            assertFalse(noxCompute.isPubliclyDecryptable(handle));
        }
        assertGt(allowedEvents, 0);
    }

    function _cast(address voter, uint64 sequence, bytes32 seed) private {
        (externalEuint16 handle, bytes memory proof) = _encryptedInput(voter, address(core), seed);
        vm.prank(voter);
        core.castVote(ballotId, sequence, handle, proof, "");
    }

    function _assertPublicState(
        uint64 sequence,
        uint8 replacements,
        uint256 weight,
        uint32 recordedVoters,
        uint256 recordedWeight
    ) private view {
        BallotReceipt memory voterReceipt = core.receipt(ballotId, VOTER);
        BallotRecord memory record = core.ballot(ballotId);
        assertTrue(voterReceipt.recorded);
        assertEq(voterReceipt.sequence, sequence);
        assertEq(voterReceipt.replacementsUsed, replacements);
        assertEq(voterReceipt.weight, weight);
        assertEq(record.recordedVoters, recordedVoters);
        assertEq(record.recordedWeight, recordedWeight);
    }

    function _encryptedInput(address owner, address app, bytes32 seed)
        private
        view
        returns (externalEuint16 handle, bytes memory proof)
    {
        bytes32 rawHandle = _confidentialHandle(seed);
        uint256 createdAt = block.timestamp;
        bytes32 domainSeparator = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256("NoxCompute"),
                keccak256("1"),
                block.chainid,
                NOX_COMPUTE
            )
        );
        bytes32 structHash = keccak256(
            abi.encode(noxCompute.HANDLE_PROOF_TYPEHASH(), rawHandle, owner, app, createdAt)
        );
        bytes32 digest = MessageHashUtils.toTypedDataHash(domainSeparator, structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(GATEWAY_PRIVATE_KEY, digest);
        proof = abi.encodePacked(owner, app, createdAt, r, s, v);
        handle = externalEuint16.wrap(rawHandle);
    }

    function _confidentialHandle(bytes32 seed) private view returns (bytes32 handle) {
        handle = keccak256(abi.encode(seed, address(core))) >> (7 * 8);
        // The local Nox chain identifier is known to fit in four bytes.
        // forge-lint: disable-next-line(unsafe-typecast)
        handle |= bytes32(bytes4(uint32(block.chainid))) >> (1 * 8);
        handle |= bytes32(bytes1(uint8(TEEType.Uint16))) >> (5 * 8);
        handle |= bytes32(bytes1(0x01)) >> (6 * 8);
    }

    function _params() private view returns (RegisterBallotParams memory params) {
        params = RegisterBallotParams({
            hostProposalId: keccak256("cast-proposal"),
            actionHash: keccak256("cast-action"),
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
