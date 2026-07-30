// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import {
    MultiSendCallOnlyCodeHashMismatch,
    SafeActionMismatch,
    SafeExecutionFailed,
    SafeProposalAlreadyExecuted
} from "../../../src/contracts/types/SafeGovernanceErrors.sol";
import { SafeAction, SafeBallotConfig } from "../../../src/contracts/types/SafeGovernanceTypes.sol";
import {
    OrderedSafeExecutionTarget,
    ReentrantSafeBatchExecutionTarget
} from "./fixtures/SafeBatchExecutionFixtures.sol";
import {
    DirectSafeExecutionTarget,
    RetryableSafeExecutionTarget,
    SafeExecutionFixture
} from "./fixtures/SafeExecutionFixtures.sol";

contract SafeConfidentialVotingModuleBatchExecutionTest is SafeExecutionFixture {
    function testPassedExactBatchExecutesAtomicallyWithCallOnlyInnerOperationsOnce() public {
        OrderedSafeExecutionTarget target = new OrderedSafeExecutionTarget();
        SafeAction[] memory actions = new SafeAction[](2);
        actions[0] = SafeAction({
            to: address(target), value: 1 ether, data: abi.encodeCall(target.record, (11))
        });
        actions[1] = SafeAction({
            to: address(target), value: 2 ether, data: abi.encodeCall(target.record, (22))
        });
        (bytes32 safeProposalId, bytes32 ballotId, SafeBallotConfig memory config) =
            _register(actions);
        _finalize(ballotId, config, true);
        uint256 safeNonceBefore = safe.nonce();

        vm.prank(KEEPER);
        module.execute(safeProposalId, actions);

        assertEq(target.calls(), 2);
        assertEq(target.valueAt(0), 11);
        assertEq(target.valueAt(1), 22);
        assertEq(target.caller(), address(safe));
        assertEq(target.received(), 3 ether);
        assertEq(address(safe).balance, 97 ether);
        assertEq(safe.nonce(), safeNonceBefore);
        assertTrue(module.proposal(safeProposalId).executed);

        vm.expectRevert(
            abi.encodeWithSelector(SafeProposalAlreadyExecuted.selector, safeProposalId)
        );
        module.execute(safeProposalId, actions);
        assertEq(target.calls(), 2);
    }

    function testRejectsChangedBatchOrderBeforeAnyInnerCall() public {
        OrderedSafeExecutionTarget target = new OrderedSafeExecutionTarget();
        SafeAction[] memory actions = _orderedActions(target);
        (bytes32 safeProposalId, bytes32 ballotId, SafeBallotConfig memory config) =
            _register(actions);
        _finalize(ballotId, config, true);
        bytes32 expectedHash = module.proposal(safeProposalId).actionHash;

        SafeAction memory first = actions[0];
        actions[0] = actions[1];
        actions[1] = first;
        bytes32 actualHash = module.hashActions(safeProposalId, actions);
        vm.expectRevert(
            abi.encodeWithSelector(
                SafeActionMismatch.selector, safeProposalId, expectedHash, actualHash
            )
        );
        module.execute(safeProposalId, actions);

        assertEq(target.calls(), 0);
        assertFalse(module.proposal(safeProposalId).executed);
    }

    function testBatchFailureIsAtomicAndExactRetrySucceeds() public {
        DirectSafeExecutionTarget firstTarget = new DirectSafeExecutionTarget();
        RetryableSafeExecutionTarget secondTarget = new RetryableSafeExecutionTarget();
        SafeAction[] memory actions = new SafeAction[](2);
        actions[0] = SafeAction({
            to: address(firstTarget),
            value: 1 ether,
            data: abi.encodeCall(firstTarget.setValue, (41))
        });
        actions[1] = SafeAction({
            to: address(secondTarget),
            value: 2 ether,
            data: abi.encodeCall(secondTarget.setValue, (42))
        });
        (bytes32 safeProposalId, bytes32 ballotId, SafeBallotConfig memory config) =
            _register(actions);
        _finalize(ballotId, config, true);

        vm.expectRevert(abi.encodeWithSelector(SafeExecutionFailed.selector, safeProposalId));
        module.execute(safeProposalId, actions);
        assertFalse(module.proposal(safeProposalId).executed);
        assertEq(firstTarget.calls(), 0);
        assertEq(secondTarget.calls(), 0);
        assertEq(address(safe).balance, 100 ether);

        secondTarget.setShouldRevert(false);
        module.execute(safeProposalId, actions);
        assertTrue(module.proposal(safeProposalId).executed);
        assertEq(firstTarget.calls(), 1);
        assertEq(secondTarget.calls(), 1);
        assertEq(address(safe).balance, 97 ether);
    }

    function testBatchReentrancyCannotExecuteProposalTwice() public {
        ReentrantSafeBatchExecutionTarget target = new ReentrantSafeBatchExecutionTarget();
        DirectSafeExecutionTarget trailingTarget = new DirectSafeExecutionTarget();
        SafeAction[] memory actions = new SafeAction[](2);
        actions[0] =
            SafeAction({ to: address(target), value: 0, data: abi.encodeCall(target.attack, ()) });
        actions[1] = SafeAction({
            to: address(trailingTarget),
            value: 0,
            data: abi.encodeCall(trailingTarget.setValue, (99))
        });
        (bytes32 safeProposalId, bytes32 ballotId, SafeBallotConfig memory config) =
            _register(actions);
        target.arm(module, safeProposalId, trailingTarget);
        _finalize(ballotId, config, true);

        module.execute(safeProposalId, actions);

        assertEq(target.calls(), 1);
        assertFalse(target.reentrySucceeded());
        assertEq(trailingTarget.calls(), 1);
        assertTrue(module.proposal(safeProposalId).executed);
    }

    function testBatchExecutionRejectsChangedMultiSendRuntimeCode() public {
        OrderedSafeExecutionTarget target = new OrderedSafeExecutionTarget();
        SafeAction[] memory actions = _orderedActions(target);
        (bytes32 safeProposalId, bytes32 ballotId, SafeBallotConfig memory config) =
            _register(actions);
        _finalize(ballotId, config, true);

        address batch = module.multiSendCallOnly();
        bytes32 expectedCodeHash = module.multiSendCallOnlyCodeHash();
        vm.etch(batch, hex"00");
        bytes32 actualCodeHash = batch.codehash;
        vm.expectRevert(
            abi.encodeWithSelector(
                MultiSendCallOnlyCodeHashMismatch.selector, batch, expectedCodeHash, actualCodeHash
            )
        );
        module.execute(safeProposalId, actions);

        assertEq(target.calls(), 0);
        assertFalse(module.proposal(safeProposalId).executed);
    }

    function _orderedActions(OrderedSafeExecutionTarget target)
        private
        pure
        returns (SafeAction[] memory actions)
    {
        actions = new SafeAction[](2);
        actions[0] = SafeAction({
            to: address(target), value: 0, data: abi.encodeCall(target.record, (11))
        });
        actions[1] = SafeAction({
            to: address(target), value: 0, data: abi.encodeCall(target.record, (22))
        });
    }
}
