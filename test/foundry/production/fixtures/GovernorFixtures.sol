// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Test } from "forge-std/Test.sol";
import { NoxCompute } from "@iexec-nox/nox-protocol-contracts/contracts/NoxCompute.sol";
import { TEEType } from "@iexec-nox/nox-protocol-contracts/contracts/utils/TypeUtils.sol";
import { TimelockController } from "@openzeppelin/contracts/governance/TimelockController.sol";
import { IVotes } from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import { externalEuint16 } from "encrypted-types/EncryptedTypes.sol";
import { ConfidentialBallotCore } from "../../../../src/contracts/core/ConfidentialBallotCore.sol";
import {
    IVotesSnapshotStrategy
} from "../../../../src/contracts/eligibility/IVotesSnapshotStrategy.sol";
import {
    MerkleWeightedAllowlistStrategy
} from "../../../../src/contracts/eligibility/MerkleWeightedAllowlistStrategy.sol";
import { ConfidentialGovernor } from "../../../../src/contracts/governor/ConfidentialGovernor.sol";
import {
    ConfidentialGovernorConfig
} from "../../../../src/contracts/types/GovernorGovernanceTypes.sol";
import { TimestampVotesTokenFixture, VotesTokenFixture } from "./EligibilityFixtures.sol";

contract GovernorActionTargetFixture {
    uint256 public value;

    function setValue(uint256 newValue) external {
        value = newValue;
    }
}

abstract contract GovernorFixture is Test {
    address internal constant NOX_COMPUTE = 0x75C6AF4430cc474b1bb9b8540b7E46D6f8e1C685;
    address internal constant PROPOSER = address(0xA11CE);
    address internal constant OUTSIDER = address(0xBAD);
    uint256 internal constant GATEWAY_PRIVATE_KEY = 0xBEEF;
    uint32 internal constant PRIVACY_FLOOR = 4;
    uint48 internal constant VOTING_DELAY = 2;
    uint32 internal constant VOTING_PERIOD = 10;

    bytes32 private constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    address[4] private voters = [PROPOSER, address(0xB0B), address(0xCA401), address(0xD0A)];
    uint256[4] private weights = [uint256(4), uint256(3), uint256(2), uint256(1)];

    NoxCompute internal noxCompute;
    VotesTokenFixture internal token;
    IVotesSnapshotStrategy internal ivotesStrategy;
    MerkleWeightedAllowlistStrategy internal merkleStrategy;
    TimelockController internal timelock;
    ConfidentialGovernor internal governor;
    ConfidentialBallotCore internal core;
    GovernorActionTargetFixture internal actionTarget;

    function setUp() public virtual {
        vm.chainId(31_337);
        _initializeClock();
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

        token = _deployToken();
        for (uint256 i = 0; i < voters.length; i++) {
            token.mint(voters[i], weights[i]);
            vm.prank(voters[i]);
            token.delegate(voters[i]);
        }
        _advancePastDelegation();

        ivotesStrategy = new IVotesSnapshotStrategy();
        merkleStrategy = new MerkleWeightedAllowlistStrategy();
        address[] memory noAccounts = new address[](0);
        timelock = new TimelockController(1 days, noAccounts, noAccounts, address(this));

        ConfidentialGovernorConfig memory config = ConfidentialGovernorConfig({
            name: "Nox Confidential Governor",
            token: IVotes(address(token)),
            timelock: timelock,
            initialVotingDelay: VOTING_DELAY,
            initialVotingPeriod: VOTING_PERIOD,
            initialProposalThreshold: 1,
            initialQuorumNumerator: 20,
            ivotesStrategy: address(ivotesStrategy),
            merkleStrategy: address(merkleStrategy),
            minimumPrivacyFloor: PRIVACY_FLOOR
        });
        governor = new ConfidentialGovernor(config);
        _configureTimelockAuthority();
        core = governor.confidentialCore();
        actionTarget = new GovernorActionTargetFixture();
    }

    function _configureTimelockAuthority() private {
        bytes32 proposerRole = timelock.PROPOSER_ROLE();
        bytes32 cancellerRole = timelock.CANCELLER_ROLE();
        bytes32 executorRole = timelock.EXECUTOR_ROLE();
        bytes32 adminRole = timelock.DEFAULT_ADMIN_ROLE();

        timelock.grantRole(proposerRole, address(governor));
        timelock.grantRole(cancellerRole, address(governor));
        timelock.grantRole(executorRole, address(0));

        assertTrue(timelock.hasRole(proposerRole, address(governor)));
        assertTrue(timelock.hasRole(cancellerRole, address(governor)));
        assertTrue(timelock.hasRole(executorRole, address(0)));
        assertTrue(timelock.hasRole(adminRole, address(timelock)));

        timelock.renounceRole(adminRole, address(this));
        assertFalse(timelock.hasRole(adminRole, address(this)));
    }

    function _initializeClock() internal virtual {
        vm.roll(10);
    }

    function _deployToken() internal virtual returns (VotesTokenFixture) {
        return new VotesTokenFixture();
    }

    function _advancePastDelegation() internal virtual {
        vm.roll(11);
    }

    function _advanceClockTo(uint256 timepoint) internal virtual {
        vm.roll(timepoint);
    }

    function _propose(string memory description)
        internal
        returns (uint256 proposalId, bytes32 ballotId)
    {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas,) =
            _proposalData(description);
        vm.prank(PROPOSER);
        return governor.proposeConfidential(targets, values, calldatas, description, PRIVACY_FLOOR);
    }

    function _proposalData(string memory description)
        internal
        view
        returns (
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory calldatas,
            bytes32 descriptionHash
        )
    {
        targets = new address[](1);
        values = new uint256[](1);
        calldatas = new bytes[](1);
        targets[0] = address(actionTarget);
        calldatas[0] = abi.encodeCall(GovernorActionTargetFixture.setValue, (99));
        descriptionHash = keccak256(bytes(description));
    }

    function _openAndCast(uint256 proposalId, bytes32 ballotId, uint256 count) internal {
        _advanceClockTo(governor.proposalSnapshot(proposalId) + 1);
        for (uint256 i = 0; i < count; i++) {
            (externalEuint16 handle, bytes memory proof) =
                _encryptedInput(voters[i], keccak256(abi.encode(proposalId, i)));
            vm.prank(voters[i]);
            core.castVote(ballotId, 1, handle, proof, "");
        }
    }

    function _close(uint256 proposalId) internal {
        _advanceClockTo(governor.proposalDeadline(proposalId) + 1);
    }

    function _finalize(bytes32 ballotId, bool passed) internal {
        bytes32 expectedVerdict = core.expectedVerdictHandle(ballotId);
        core.finalize(
            ballotId,
            _decryptionProof(
                expectedVerdict, passed ? bytes(hex"01") : bytes(hex"00"), GATEWAY_PRIVATE_KEY
            )
        );
    }

    function _decryptionProof(bytes32 handle, bytes memory plaintext, uint256 signerKey)
        internal
        view
        returns (bytes memory proof)
    {
        bytes32 structHash = keccak256(
            abi.encode(noxCompute.DECRYPTION_PROOF_TYPEHASH(), handle, keccak256(plaintext))
        );
        bytes32 digest = MessageHashUtils.toTypedDataHash(_domainSeparator(), structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        proof = abi.encodePacked(r, s, v, plaintext);
    }

    function _encryptedInput(address owner, bytes32 seed)
        private
        view
        returns (externalEuint16 handle, bytes memory proof)
    {
        bytes32 rawHandle = _confidentialHandle(seed);
        uint256 createdAt = block.timestamp;
        bytes32 structHash = keccak256(
            abi.encode(
                noxCompute.HANDLE_PROOF_TYPEHASH(), rawHandle, owner, address(core), createdAt
            )
        );
        bytes32 digest = MessageHashUtils.toTypedDataHash(_domainSeparator(), structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(GATEWAY_PRIVATE_KEY, digest);
        proof = abi.encodePacked(owner, address(core), createdAt, r, s, v);
        handle = externalEuint16.wrap(rawHandle);
    }

    function _domainSeparator() private view returns (bytes32) {
        return keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256("NoxCompute"),
                keccak256("1"),
                block.chainid,
                NOX_COMPUTE
            )
        );
    }

    function _confidentialHandle(bytes32 seed) private view returns (bytes32 handle) {
        handle = keccak256(abi.encode(seed, address(core))) >> (7 * 8);
        // The local Nox chain identifier is known to fit in four bytes.
        // forge-lint: disable-next-line(unsafe-typecast)
        handle |= bytes32(bytes4(uint32(block.chainid))) >> (1 * 8);
        handle |= bytes32(bytes1(uint8(TEEType.Uint16))) >> (5 * 8);
        handle |= bytes32(bytes1(0x01)) >> (6 * 8);
    }
}

abstract contract TimestampGovernorFixture is GovernorFixture {
    function _initializeClock() internal override {
        vm.roll(10);
        vm.warp(1_000_000);
    }

    function _deployToken() internal override returns (VotesTokenFixture) {
        return new TimestampVotesTokenFixture();
    }

    function _advancePastDelegation() internal override {
        vm.warp(block.timestamp + 1);
    }

    function _advanceClockTo(uint256 timepoint) internal override {
        vm.warp(timepoint);
    }
}
