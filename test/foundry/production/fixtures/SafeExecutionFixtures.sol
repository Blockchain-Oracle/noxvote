// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Test } from "forge-std/Test.sol";
import { Safe } from "@safe-global/safe-smart-account/contracts/Safe.sol";
import { Enum } from "@safe-global/safe-smart-account/contracts/libraries/Enum.sol";
import {
    MultiSendCallOnly
} from "@safe-global/safe-smart-account/contracts/libraries/MultiSendCallOnly.sol";
import { SafeProxy } from "@safe-global/safe-smart-account/contracts/proxies/SafeProxy.sol";
import { NoxCompute } from "@iexec-nox/nox-protocol-contracts/contracts/NoxCompute.sol";
import { TEEType } from "@iexec-nox/nox-protocol-contracts/contracts/utils/TypeUtils.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import { externalEuint16 } from "encrypted-types/EncryptedTypes.sol";
import { ConfidentialBallotCore } from "../../../../src/contracts/core/ConfidentialBallotCore.sol";
import {
    SafeConfidentialVotingModule
} from "../../../../src/contracts/safe/SafeConfidentialVotingModule.sol";
import {
    SafeAction,
    SafeBallotConfig,
    SafeProposalRecord
} from "../../../../src/contracts/types/SafeGovernanceTypes.sol";
import { EligibilityStrategyFixture } from "./CoreFixtures.sol";

contract DirectSafeExecutionTarget {
    uint256 public value;
    uint256 public calls;

    function setValue(uint256 newValue) external payable {
        value = newValue;
        calls += 1;
    }
}

contract RetryableSafeExecutionTarget {
    bool public shouldRevert = true;
    uint256 public value;
    uint256 public calls;

    function setShouldRevert(bool nextValue) external {
        shouldRevert = nextValue;
    }

    function setValue(uint256 newValue) external payable {
        if (shouldRevert) revert("retryable target failure");
        value = newValue;
        calls += 1;
    }
}

contract ReentrantSafeExecutionTarget {
    SafeConfidentialVotingModule private module;
    bytes32 private safeProposalId;
    bool public reentrySucceeded;
    uint256 public calls;

    function arm(SafeConfidentialVotingModule module_, bytes32 safeProposalId_) external {
        module = module_;
        safeProposalId = safeProposalId_;
    }

    function attack() external {
        SafeAction[] memory actions = new SafeAction[](1);
        actions[0] =
            SafeAction({ to: address(this), value: 0, data: abi.encodeCall(this.attack, ()) });
        try module.execute(safeProposalId, actions) {
            reentrySucceeded = true;
        } catch { }
        calls += 1;
    }
}

abstract contract SafeExecutionFixture is Test {
    address internal constant NOX_COMPUTE = 0x75C6AF4430cc474b1bb9b8540b7E46D6f8e1C685;
    address internal constant KEEPER = address(0xC105E);
    uint256 internal constant GATEWAY_PRIVATE_KEY = 0xBEEF;
    uint256 private constant OWNER_A_KEY = 0xA11CE;
    uint256 private constant OWNER_B_KEY = 0xB0B;
    bytes32 private constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    address[4] private voters =
        [address(0xA11CE), address(0xB0B), address(0xCA401), address(0xD0A)];

    Safe internal safe;
    SafeConfidentialVotingModule internal module;
    NoxCompute internal noxCompute;
    address private ownerA;
    address private ownerB;

    function setUp() public virtual {
        vm.chainId(31_337);
        vm.warp(1_000_000);
        _deployNox();

        ownerA = vm.addr(OWNER_A_KEY);
        ownerB = vm.addr(OWNER_B_KEY);
        Safe singleton = new Safe();
        safe = Safe(payable(address(new SafeProxy(address(singleton)))));
        address[] memory owners = new address[](2);
        owners[0] = ownerA;
        owners[1] = ownerB;
        safe.setup(owners, 2, address(0), "", address(0), address(0), 0, payable(address(0)));
        vm.deal(address(safe), 100 ether);

        EligibilityStrategyFixture firstStrategy = new EligibilityStrategyFixture();
        EligibilityStrategyFixture secondStrategy = new EligibilityStrategyFixture();
        MultiSendCallOnly multiSendCallOnly = new MultiSendCallOnly();
        module = new SafeConfidentialVotingModule(
            address(safe),
            address(firstStrategy),
            address(secondStrategy),
            4,
            address(multiSendCallOnly)
        );
        assertTrue(
            _executeSafe(address(safe), abi.encodeCall(safe.enableModule, (address(module))))
        );
    }

    function _register(SafeAction[] memory actions)
        internal
        returns (bytes32 safeProposalId, bytes32 ballotId, SafeBallotConfig memory config)
    {
        config = SafeBallotConfig({
            eligibilityStrategy: module.confidentialCore().firstEligibilityStrategy(),
            eligibilityConfig: abi.encode(uint32(4)),
            snapshot: 42,
            voteStart: uint48(block.timestamp + 10),
            voteEnd: uint48(block.timestamp + 20),
            privacyFloor: 4,
            maxReplacements: 2,
            governanceQuorum: 1
        });
        safeProposalId = keccak256(
            abi.encode(block.chainid, address(module), address(safe), module.proposalNonce() + 1)
        );
        assertTrue(
            _executeSafe(
                address(module), abi.encodeCall(module.registerProposal, (actions, config))
            )
        );
        SafeProposalRecord memory record = module.proposal(safeProposalId);
        ballotId = record.ballotId;
    }

    function _singleAction(address to, uint256 value, bytes memory data)
        internal
        pure
        returns (SafeAction[] memory actions)
    {
        actions = new SafeAction[](1);
        actions[0] = SafeAction({ to: to, value: value, data: data });
    }

    function _finalize(bytes32 ballotId, SafeBallotConfig memory config, bool passed) internal {
        ConfidentialBallotCore core = module.confidentialCore();
        vm.warp(config.voteStart + 1);
        for (uint256 i = 0; i < voters.length; ++i) {
            (externalEuint16 handle, bytes memory proof) =
                _encryptedInput(voters[i], keccak256(abi.encode(ballotId, i)));
            vm.prank(voters[i]);
            core.castVote(ballotId, 1, handle, proof, "");
        }
        vm.warp(config.voteEnd + 1);
        vm.prank(KEEPER);
        core.requestTally(ballotId);
        bytes32 verdictHandle = core.expectedVerdictHandle(ballotId);
        core.finalize(
            ballotId,
            _decryptionProof(
                verdictHandle, passed ? bytes(hex"01") : bytes(hex"00"), GATEWAY_PRIVATE_KEY
            )
        );
    }

    function _withhold(bytes32 ballotId, SafeBallotConfig memory config) internal {
        ConfidentialBallotCore core = module.confidentialCore();
        vm.warp(config.voteStart + 1);
        for (uint256 i = 0; i < 3; ++i) {
            (externalEuint16 handle, bytes memory proof) =
                _encryptedInput(voters[i], keccak256(abi.encode(ballotId, i)));
            vm.prank(voters[i]);
            core.castVote(ballotId, 1, handle, proof, "");
        }
        vm.warp(config.voteEnd + 1);
        core.requestTally(ballotId);
    }

    function _cancel(bytes32 ballotId) internal {
        ConfidentialBallotCore core = module.confidentialCore();
        vm.prank(address(module));
        core.cancel(ballotId);
    }

    function _executeSafe(address to, bytes memory data) internal returns (bool) {
        bytes32 transactionHash = safe.getTransactionHash(
            to, 0, data, Enum.Operation.Call, 0, 0, 0, address(0), address(0), safe.nonce()
        );
        (uint8 vA, bytes32 rA, bytes32 sA) = vm.sign(OWNER_A_KEY, transactionHash);
        (uint8 vB, bytes32 rB, bytes32 sB) = vm.sign(OWNER_B_KEY, transactionHash);
        bytes memory signatureA = abi.encodePacked(rA, sA, vA);
        bytes memory signatureB = abi.encodePacked(rB, sB, vB);
        bytes memory signatures = ownerA < ownerB
            ? bytes.concat(signatureA, signatureB)
            : bytes.concat(signatureB, signatureA);
        return safe.execTransaction(
            to, 0, data, Enum.Operation.Call, 0, 0, 0, address(0), payable(address(0)), signatures
        );
    }

    function _deployNox() private {
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
    }

    function _encryptedInput(address owner, bytes32 seed)
        private
        view
        returns (externalEuint16 handle, bytes memory proof)
    {
        bytes32 rawHandle =
            keccak256(abi.encode(seed, address(module.confidentialCore()))) >> (7 * 8);
        rawHandle |= bytes32(bytes4(uint32(block.chainid))) >> (1 * 8);
        rawHandle |= bytes32(bytes1(uint8(TEEType.Uint16))) >> (5 * 8);
        rawHandle |= bytes32(bytes1(0x01)) >> (6 * 8);
        uint256 createdAt = block.timestamp;
        bytes32 structHash = keccak256(
            abi.encode(
                noxCompute.HANDLE_PROOF_TYPEHASH(),
                rawHandle,
                owner,
                address(module.confidentialCore()),
                createdAt
            )
        );
        bytes32 digest = MessageHashUtils.toTypedDataHash(_domainSeparator(), structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(GATEWAY_PRIVATE_KEY, digest);
        proof = abi.encodePacked(owner, address(module.confidentialCore()), createdAt, r, s, v);
        handle = externalEuint16.wrap(rawHandle);
    }

    function _decryptionProof(bytes32 handle, bytes memory plaintext, uint256 signerKey)
        private
        view
        returns (bytes memory proof)
    {
        bytes32 structHash = keccak256(
            abi.encode(noxCompute.DECRYPTION_PROOF_TYPEHASH(), handle, keccak256(plaintext))
        );
        bytes32 digest = MessageHashUtils.toTypedDataHash(_domainSeparator(), structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        return abi.encodePacked(r, s, v, plaintext);
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
}
