// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Test } from "forge-std/Test.sol";
import { Safe } from "@safe-global/safe-smart-account/contracts/Safe.sol";
import { SafeProxy } from "@safe-global/safe-smart-account/contracts/proxies/SafeProxy.sol";
import { Enum } from "@safe-global/safe-smart-account/contracts/libraries/Enum.sol";
import {
    SafeConfidentialVotingModule
} from "../../../src/contracts/safe/SafeConfidentialVotingModule.sol";
import {
    InvalidGovernanceQuorum,
    InvalidMultiSendCallOnlyAddress,
    InvalidSafeAddress,
    InvalidSafeActionCount,
    InvalidSafeActionTarget,
    OnlySafe,
    SafeModuleNotEnabled
} from "../../../src/contracts/types/SafeGovernanceErrors.sol";
import {
    SafeAction,
    SafeBallotConfig,
    SafeProposalRecord
} from "../../../src/contracts/types/SafeGovernanceTypes.sol";
import { BallotRecord } from "../../../src/contracts/types/ConfidentialGovernanceTypes.sol";
import { EligibilityStrategyFixture } from "./fixtures/CoreFixtures.sol";
import {
    MultiSendCallOnly
} from "@safe-global/safe-smart-account/contracts/libraries/MultiSendCallOnly.sol";

contract SafeConfidentialVotingModuleRegistrationTest is Test {
    uint256 private constant OWNER_A_KEY = 0xA11CE;
    uint256 private constant OWNER_B_KEY = 0xB0B;

    Safe private safe;
    SafeConfidentialVotingModule private module;
    EligibilityStrategyFixture private firstStrategy;
    EligibilityStrategyFixture private secondStrategy;
    MultiSendCallOnly private multiSendCallOnly;
    address private ownerA;
    address private ownerB;

    function setUp() public {
        vm.warp(1_000_000);
        ownerA = vm.addr(OWNER_A_KEY);
        ownerB = vm.addr(OWNER_B_KEY);

        Safe singleton = new Safe();
        SafeProxy proxy = new SafeProxy(address(singleton));
        safe = Safe(payable(address(proxy)));
        address[] memory owners = new address[](2);
        owners[0] = ownerA;
        owners[1] = ownerB;
        safe.setup(owners, 2, address(0), "", address(0), address(0), 0, payable(address(0)));

        firstStrategy = new EligibilityStrategyFixture();
        secondStrategy = new EligibilityStrategyFixture();
        multiSendCallOnly = new MultiSendCallOnly();
        module = new SafeConfidentialVotingModule(
            address(safe),
            address(firstStrategy),
            address(secondStrategy),
            4,
            address(multiSendCallOnly)
        );
    }

    function testBindsImmutableSafeCoreAndBatchContract() public view {
        assertEq(module.safe(), address(safe));
        assertEq(module.confidentialCore().host(), address(module));
        assertEq(module.multiSendCallOnly(), address(multiSendCallOnly));
        assertEq(module.multiSendCallOnlyCodeHash(), address(multiSendCallOnly).codehash);
        assertEq(module.confidentialClockMode(), "mode=timestamp");
        assertEq(module.confidentialClock(), uint48(block.timestamp));
        assertFalse(module.isInstalled());
    }

    function testRejectsInvalidSafeAndBatchConstruction() public {
        vm.expectRevert(abi.encodeWithSelector(InvalidSafeAddress.selector, address(0)));
        new SafeConfidentialVotingModule(
            address(0),
            address(firstStrategy),
            address(secondStrategy),
            4,
            address(multiSendCallOnly)
        );

        address notAContract = address(0xBADC0DE);
        vm.expectRevert(
            abi.encodeWithSelector(InvalidMultiSendCallOnlyAddress.selector, notAContract)
        );
        new SafeConfidentialVotingModule(
            address(safe), address(firstStrategy), address(secondStrategy), 4, notAContract
        );
    }

    function testRejectsDirectOwnerAndDisabledSafeRegistration() public {
        (SafeAction[] memory actions, SafeBallotConfig memory config) = _proposal();

        vm.prank(ownerA);
        vm.expectRevert(abi.encodeWithSelector(OnlySafe.selector, ownerA));
        module.registerProposal(actions, config);

        bytes memory data = abi.encodeCall(module.registerProposal, (actions, config));
        bytes memory signatures = _signaturesFor(address(module), data);
        vm.expectRevert(
            abi.encodeWithSelector(SafeModuleNotEnabled.selector, address(safe), address(module))
        );
        _executeSafeWithSignatures(address(module), data, signatures);
        assertEq(module.proposalNonce(), 0);
    }

    function testRejectsEmptyActionsZeroTargetsAndZeroQuorumAtomically() public {
        _enableModule();
        (SafeAction[] memory actions, SafeBallotConfig memory config) = _proposal();

        SafeAction[] memory empty = new SafeAction[](0);
        _expectRegistrationRevert(
            empty, config, abi.encodeWithSelector(InvalidSafeActionCount.selector, uint256(0))
        );

        actions[0].to = address(0);
        _expectRegistrationRevert(
            actions, config, abi.encodeWithSelector(InvalidSafeActionTarget.selector, uint256(0))
        );

        (actions, config) = _proposal();
        config.governanceQuorum = 0;
        _expectRegistrationRevert(
            actions, config, abi.encodeWithSelector(InvalidGovernanceQuorum.selector, uint256(0))
        );
        assertEq(module.proposalNonce(), 0);
    }

    function testThresholdSafeRegistersExactActionAndConfiguration() public {
        _enableModule();
        (SafeAction[] memory actions, SafeBallotConfig memory config) = _proposal();
        bytes32 safeProposalId =
            keccak256(abi.encode(block.chainid, address(module), address(safe), uint256(1)));
        bytes32 actionHash = module.hashActions(safeProposalId, actions);

        bool success = _executeSafe(
            address(module), abi.encodeCall(module.registerProposal, (actions, config))
        );
        assertTrue(success);
        assertEq(module.proposalNonce(), 1);

        SafeProposalRecord memory proposal = module.proposal(safeProposalId);
        assertEq(proposal.actionHash, actionHash);
        assertEq(proposal.governanceQuorum, config.governanceQuorum);
        assertFalse(proposal.executed);
        assertEq(module.governanceQuorum(safeProposalId, config.snapshot), 7);

        BallotRecord memory ballot = module.confidentialCore().ballot(proposal.ballotId);
        assertEq(ballot.hostProposalId, safeProposalId);
        assertEq(ballot.actionHash, actionHash);
        assertEq(ballot.eligibilityStrategy, config.eligibilityStrategy);
        assertEq(ballot.snapshot, config.snapshot);
        assertEq(ballot.voteStart, config.voteStart);
        assertEq(ballot.voteEnd, config.voteEnd);
        assertEq(ballot.privacyFloor, config.privacyFloor);
        assertEq(ballot.maxReplacements, config.maxReplacements);
        assertEq(
            module.confidentialCore().eligibilityConfig(proposal.ballotId), config.eligibilityConfig
        );
    }

    function testActionHashBindsProposalDomainOrderTargetValueAndData() public {
        _enableModule();
        (SafeAction[] memory actions,) = _proposal();
        bytes32 proposalOne = keccak256("proposal-one");
        bytes32 baseline = module.hashActions(proposalOne, actions);
        bytes32[] memory actionHashes = new bytes32[](2);
        bytes32 actionTypehash = keccak256("SafeAction(address to,uint256 value,bytes32 dataHash)");
        bytes32 bundleTypehash = keccak256(
            "SafeActionBundle(uint256 chainId,address module,address safe,bytes32 safeProposalId,bytes32 actionsHash)"
        );
        for (uint256 i = 0; i < actions.length; ++i) {
            actionHashes[i] = keccak256(
                abi.encode(
                    actionTypehash, actions[i].to, actions[i].value, keccak256(actions[i].data)
                )
            );
        }
        bytes32 expected = keccak256(
            abi.encode(
                bundleTypehash,
                block.chainid,
                address(module),
                address(safe),
                proposalOne,
                keccak256(abi.encode(actionHashes))
            )
        );
        assertEq(baseline, expected);

        SafeAction[] memory changed = _copy(actions);
        changed[0].to = address(0xBEEF);
        assertNotEq(module.hashActions(proposalOne, changed), baseline);

        changed = _copy(actions);
        changed[0].value += 1;
        assertNotEq(module.hashActions(proposalOne, changed), baseline);

        changed = _copy(actions);
        changed[0].data = hex"DEADBEEF";
        assertNotEq(module.hashActions(proposalOne, changed), baseline);

        changed = _copy(actions);
        (changed[0], changed[1]) = (changed[1], changed[0]);
        assertNotEq(module.hashActions(proposalOne, changed), baseline);
        assertNotEq(module.hashActions(keccak256("proposal-two"), actions), baseline);
    }

    function testIdenticalActionsCreateDistinctSafeAndCoreProposalIds() public {
        _enableModule();
        (SafeAction[] memory actions, SafeBallotConfig memory config) = _proposal();
        assertTrue(
            _executeSafe(
                address(module), abi.encodeCall(module.registerProposal, (actions, config))
            )
        );

        bytes32 firstId =
            keccak256(abi.encode(block.chainid, address(module), address(safe), uint256(1)));
        config.voteStart += 1;
        config.voteEnd += 1;
        assertTrue(
            _executeSafe(
                address(module), abi.encodeCall(module.registerProposal, (actions, config))
            )
        );
        bytes32 secondId =
            keccak256(abi.encode(block.chainid, address(module), address(safe), uint256(2)));

        assertNotEq(firstId, secondId);
        assertNotEq(module.proposal(firstId).ballotId, module.proposal(secondId).ballotId);
    }

    function _enableModule() private {
        bool success =
            _executeSafe(address(safe), abi.encodeCall(safe.enableModule, (address(module))));
        assertTrue(success);
        assertTrue(module.isInstalled());
    }

    function _proposal()
        private
        view
        returns (SafeAction[] memory actions, SafeBallotConfig memory config)
    {
        actions = new SafeAction[](2);
        actions[0] = SafeAction({ to: address(0x1001), value: 1 ether, data: hex"1234" });
        actions[1] = SafeAction({ to: address(0x1002), value: 0, data: hex"5678" });
        config = SafeBallotConfig({
            eligibilityStrategy: address(firstStrategy),
            eligibilityConfig: abi.encode(uint32(4)),
            snapshot: 42,
            voteStart: uint48(block.timestamp + 100),
            voteEnd: uint48(block.timestamp + 200),
            privacyFloor: 4,
            maxReplacements: 2,
            governanceQuorum: 7
        });
    }

    function _copy(SafeAction[] memory source) private pure returns (SafeAction[] memory copied) {
        copied = new SafeAction[](source.length);
        for (uint256 i = 0; i < source.length; ++i) {
            copied[i] = source[i];
        }
    }

    function _executeSafe(address to, bytes memory data) private returns (bool) {
        return _executeSafeWithSignatures(to, data, _signaturesFor(to, data));
    }

    function _expectRegistrationRevert(
        SafeAction[] memory actions,
        SafeBallotConfig memory config,
        bytes memory expectedError
    ) private {
        bytes memory data = abi.encodeCall(module.registerProposal, (actions, config));
        bytes memory signatures = _signaturesFor(address(module), data);
        vm.expectRevert(expectedError);
        _executeSafeWithSignatures(address(module), data, signatures);
    }

    function _signaturesFor(address to, bytes memory data) private view returns (bytes memory) {
        bytes32 transactionHash = safe.getTransactionHash(
            to, 0, data, Enum.Operation.Call, 0, 0, 0, address(0), address(0), safe.nonce()
        );
        return _orderedSignatures(transactionHash);
    }

    function _executeSafeWithSignatures(address to, bytes memory data, bytes memory signatures)
        private
        returns (bool)
    {
        return safe.execTransaction(
            to, 0, data, Enum.Operation.Call, 0, 0, 0, address(0), payable(address(0)), signatures
        );
    }

    function _orderedSignatures(bytes32 digest) private view returns (bytes memory signatures) {
        (uint8 vA, bytes32 rA, bytes32 sA) = vm.sign(OWNER_A_KEY, digest);
        (uint8 vB, bytes32 rB, bytes32 sB) = vm.sign(OWNER_B_KEY, digest);
        bytes memory signatureA = abi.encodePacked(rA, sA, vA);
        bytes memory signatureB = abi.encodePacked(rB, sB, vB);
        return ownerA < ownerB
            ? bytes.concat(signatureA, signatureB)
            : bytes.concat(signatureB, signatureA);
    }
}
