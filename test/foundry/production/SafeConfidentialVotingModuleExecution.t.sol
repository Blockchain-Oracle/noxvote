// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Result } from "../../../src/contracts/types/ConfidentialGovernanceTypes.sol";
import {
    SafeActionMismatch,
    SafeExecutionFailed,
    SafeModuleNotEnabled,
    SafeProposalAlreadyExecuted,
    SafeProposalNotPassed
} from "../../../src/contracts/types/SafeGovernanceErrors.sol";
import {
    SafeAction,
    SafeBallotConfig,
    SafeProposalRecord
} from "../../../src/contracts/types/SafeGovernanceTypes.sol";
import {
    DirectSafeExecutionTarget,
    ReentrantSafeExecutionTarget,
    RetryableSafeExecutionTarget,
    SafeExecutionFixture
} from "./fixtures/SafeExecutionFixtures.sol";

contract SafeConfidentialVotingModuleExecutionTest is SafeExecutionFixture {
    function testPassedExactSingleCallExecutesPermissionlesslyOnce() public {
        DirectSafeExecutionTarget target = new DirectSafeExecutionTarget();
        SafeAction[] memory actions =
            _singleAction(address(target), 1 ether, abi.encodeCall(target.setValue, (42)));
        (bytes32 safeProposalId, bytes32 ballotId, SafeBallotConfig memory config) =
            _register(actions);
        _finalize(ballotId, config, true);
        uint256 safeNonceBefore = safe.nonce();

        vm.prank(KEEPER);
        module.execute(safeProposalId, actions);

        assertEq(target.value(), 42);
        assertEq(target.calls(), 1);
        assertEq(address(safe).balance, 99 ether);
        assertEq(safe.nonce(), safeNonceBefore);
        assertTrue(module.proposal(safeProposalId).executed);

        vm.expectRevert(
            abi.encodeWithSelector(SafeProposalAlreadyExecuted.selector, safeProposalId)
        );
        module.execute(safeProposalId, actions);
        assertEq(target.calls(), 1);
    }

    function testRejectsChangedTargetValueAndData() public {
        DirectSafeExecutionTarget target = new DirectSafeExecutionTarget();
        DirectSafeExecutionTarget otherTarget = new DirectSafeExecutionTarget();
        SafeAction[] memory actions =
            _singleAction(address(target), 0, abi.encodeCall(target.setValue, (42)));
        (bytes32 safeProposalId, bytes32 ballotId, SafeBallotConfig memory config) =
            _register(actions);
        _finalize(ballotId, config, true);
        bytes32 expectedHash = module.proposal(safeProposalId).actionHash;

        SafeAction[] memory changed =
            _singleAction(address(otherTarget), 0, abi.encodeCall(otherTarget.setValue, (42)));
        _expectActionMismatch(safeProposalId, expectedHash, changed);
        changed = _singleAction(address(target), 1, abi.encodeCall(target.setValue, (42)));
        _expectActionMismatch(safeProposalId, expectedHash, changed);
        changed = _singleAction(address(target), 0, abi.encodeCall(target.setValue, (43)));
        _expectActionMismatch(safeProposalId, expectedHash, changed);

        assertEq(target.calls(), 0);
    }

    function testPendingRejectedWithheldAndCanceledExecuteNothing() public {
        DirectSafeExecutionTarget target = new DirectSafeExecutionTarget();
        SafeAction[] memory actions =
            _singleAction(address(target), 0, abi.encodeCall(target.setValue, (42)));

        (bytes32 pendingId,,) = _register(actions);
        _expectNotPassed(pendingId, actions, Result.None);

        (bytes32 rejectedId, bytes32 rejectedBallot, SafeBallotConfig memory rejectedConfig) =
            _register(actions);
        _finalize(rejectedBallot, rejectedConfig, false);
        _expectNotPassed(rejectedId, actions, Result.Rejected);

        (bytes32 withheldId, bytes32 withheldBallot, SafeBallotConfig memory withheldConfig) =
            _register(actions);
        _withhold(withheldBallot, withheldConfig);
        _expectNotPassed(withheldId, actions, Result.Withheld);

        (bytes32 canceledId, bytes32 canceledBallot,) = _register(actions);
        _cancel(canceledBallot);
        _expectNotPassed(canceledId, actions, Result.Canceled);
        assertEq(target.calls(), 0);
    }

    function testSafeFailureRollsBackAndExactRetrySucceeds() public {
        RetryableSafeExecutionTarget target = new RetryableSafeExecutionTarget();
        SafeAction[] memory actions =
            _singleAction(address(target), 0, abi.encodeCall(target.setValue, (42)));
        (bytes32 safeProposalId, bytes32 ballotId, SafeBallotConfig memory config) =
            _register(actions);
        _finalize(ballotId, config, true);

        vm.expectRevert(abi.encodeWithSelector(SafeExecutionFailed.selector, safeProposalId));
        module.execute(safeProposalId, actions);
        assertFalse(module.proposal(safeProposalId).executed);
        assertEq(target.calls(), 0);

        target.setShouldRevert(false);
        module.execute(safeProposalId, actions);
        assertTrue(module.proposal(safeProposalId).executed);
        assertEq(target.value(), 42);
        assertEq(target.calls(), 1);
    }

    function testReentrantTargetCannotExecuteProposalTwice() public {
        ReentrantSafeExecutionTarget target = new ReentrantSafeExecutionTarget();
        SafeAction[] memory actions =
            _singleAction(address(target), 0, abi.encodeCall(target.attack, ()));
        (bytes32 safeProposalId, bytes32 ballotId, SafeBallotConfig memory config) =
            _register(actions);
        target.arm(module, safeProposalId);
        _finalize(ballotId, config, true);

        module.execute(safeProposalId, actions);
        assertEq(target.calls(), 1);
        assertFalse(target.reentrySucceeded());
        assertTrue(module.proposal(safeProposalId).executed);
    }

    function testDisabledModuleCannotExecutePassedProposal() public {
        DirectSafeExecutionTarget target = new DirectSafeExecutionTarget();
        SafeAction[] memory actions =
            _singleAction(address(target), 0, abi.encodeCall(target.setValue, (42)));
        (bytes32 safeProposalId, bytes32 ballotId, SafeBallotConfig memory config) =
            _register(actions);
        _finalize(ballotId, config, true);
        assertTrue(
            _executeSafe(
                address(safe), abi.encodeCall(safe.disableModule, (address(0x1), address(module)))
            )
        );

        vm.expectRevert(
            abi.encodeWithSelector(SafeModuleNotEnabled.selector, address(safe), address(module))
        );
        module.execute(safeProposalId, actions);
        assertFalse(module.proposal(safeProposalId).executed);
        assertEq(target.calls(), 0);
    }

    function _expectActionMismatch(
        bytes32 safeProposalId,
        bytes32 expectedHash,
        SafeAction[] memory changed
    ) private {
        bytes32 actualHash = module.hashActions(safeProposalId, changed);
        vm.expectRevert(
            abi.encodeWithSelector(
                SafeActionMismatch.selector, safeProposalId, expectedHash, actualHash
            )
        );
        module.execute(safeProposalId, changed);
    }

    function _expectNotPassed(bytes32 safeProposalId, SafeAction[] memory actions, Result actual)
        private
    {
        vm.expectRevert(
            abi.encodeWithSelector(SafeProposalNotPassed.selector, safeProposalId, actual)
        );
        module.execute(safeProposalId, actions);
    }
}
