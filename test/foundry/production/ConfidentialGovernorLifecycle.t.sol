// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { IGovernor } from "@openzeppelin/contracts/governance/IGovernor.sol";
import {
    UseConfidentialCancellation
} from "../../../src/contracts/types/GovernorGovernanceErrors.sol";
import {
    ConfidentialProposalState
} from "../../../src/contracts/types/GovernorGovernanceTypes.sol";
import {
    DetailedState,
    Result
} from "../../../src/contracts/types/ConfidentialGovernanceTypes.sol";
import { GovernorFixture } from "./fixtures/GovernorFixtures.sol";

contract ConfidentialGovernorLifecycleTest is GovernorFixture {
    function testDetailedLifecycleAndClosedProjectionRemainTruthful() external {
        (uint256 proposalId, bytes32 ballotId) = _propose("Lifecycle projection");

        assertEq(
            uint8(governor.confidentialState(proposalId)),
            uint8(ConfidentialProposalState.Scheduled)
        );
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Pending));

        vm.roll(governor.proposalSnapshot(proposalId) + 1);
        assertEq(
            uint8(governor.confidentialState(proposalId)), uint8(ConfidentialProposalState.Open)
        );
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Active));

        _close(proposalId);
        assertEq(uint8(core.detailedState(ballotId)), uint8(DetailedState.Closed));
        assertEq(
            uint8(governor.confidentialState(proposalId)), uint8(ConfidentialProposalState.Closed)
        );
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Pending));
        _expectQueueState(proposalId, "Lifecycle projection", IGovernor.ProposalState.Pending);
    }

    function testTallyPendingProjectsPendingAndCannotQueue() external {
        (uint256 proposalId, bytes32 ballotId) = _propose("Tally pending projection");
        _openAndCast(proposalId, ballotId, 4);
        _close(proposalId);
        core.requestTally(ballotId);

        assertEq(uint8(core.detailedState(ballotId)), uint8(DetailedState.TallyPending));
        assertEq(
            uint8(governor.confidentialState(proposalId)),
            uint8(ConfidentialProposalState.TallyPending)
        );
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Pending));
        _expectQueueState(proposalId, "Tally pending projection", IGovernor.ProposalState.Pending);
    }

    function testWithheldProjectsDefeatedAndCannotQueue() external {
        (uint256 proposalId, bytes32 ballotId) = _propose("Withheld projection");
        _close(proposalId);
        core.requestTally(ballotId);

        assertEq(uint8(core.result(ballotId)), uint8(Result.Withheld));
        assertEq(
            uint8(governor.confidentialState(proposalId)), uint8(ConfidentialProposalState.Withheld)
        );
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Defeated));
        _expectQueueState(proposalId, "Withheld projection", IGovernor.ProposalState.Defeated);
    }

    function testRejectedProjectsDefeatedAndCannotQueue() external {
        (uint256 proposalId, bytes32 ballotId) = _propose("Rejected projection");
        _openAndCast(proposalId, ballotId, 4);
        _close(proposalId);
        core.requestTally(ballotId);
        _finalize(ballotId, false);

        assertEq(uint8(core.result(ballotId)), uint8(Result.Rejected));
        assertEq(
            uint8(governor.confidentialState(proposalId)), uint8(ConfidentialProposalState.Rejected)
        );
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Defeated));
        _expectQueueState(proposalId, "Rejected projection", IGovernor.ProposalState.Defeated);
    }

    function testPassedProjectsSucceededWithoutBypassingTimelock() external {
        (uint256 proposalId, bytes32 ballotId) = _propose("Passed projection");
        _openAndCast(proposalId, ballotId, 4);
        _close(proposalId);
        core.requestTally(ballotId);
        _finalize(ballotId, true);

        assertEq(uint8(core.result(ballotId)), uint8(Result.Passed));
        assertEq(
            uint8(governor.confidentialState(proposalId)), uint8(ConfidentialProposalState.Passed)
        );
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Succeeded));
        assertTrue(governor.proposalNeedsQueuing(proposalId));
        assertEq(actionTarget.value(), 0);
    }

    function testConfidentialCancellationSynchronizesGovernorAndCore() external {
        string memory description = "Synchronized cancellation";
        (uint256 proposalId, bytes32 ballotId) = _propose(description);
        (
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory calldatas,
            bytes32 hash
        ) = _proposalData(description);

        vm.prank(PROPOSER);
        uint256 canceledProposalId = governor.cancelConfidential(targets, values, calldatas, hash);

        assertEq(canceledProposalId, proposalId);
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Canceled));
        assertEq(
            uint8(governor.confidentialState(proposalId)), uint8(ConfidentialProposalState.Canceled)
        );
        assertEq(uint8(core.detailedState(ballotId)), uint8(DetailedState.Canceled));
        assertEq(uint8(core.result(ballotId)), uint8(Result.Canceled));
    }

    function testCancellationRejectsAlternateAndPostOpenRoutes() external {
        string memory description = "Cancellation boundary";
        (uint256 proposalId, bytes32 ballotId) = _propose(description);
        (
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory calldatas,
            bytes32 hash
        ) = _proposalData(description);

        vm.expectRevert(
            abi.encodeWithSelector(IGovernor.GovernorUnableToCancel.selector, proposalId, OUTSIDER)
        );
        vm.prank(OUTSIDER);
        governor.cancelConfidential(targets, values, calldatas, hash);

        vm.expectRevert(UseConfidentialCancellation.selector);
        vm.prank(PROPOSER);
        governor.cancel(targets, values, calldatas, hash);

        vm.roll(governor.proposalSnapshot(proposalId) + 1);
        vm.expectRevert(
            abi.encodeWithSelector(IGovernor.GovernorUnableToCancel.selector, proposalId, PROPOSER)
        );
        vm.prank(PROPOSER);
        governor.cancelConfidential(targets, values, calldatas, hash);

        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Active));
        assertEq(uint8(core.detailedState(ballotId)), uint8(DetailedState.Open));
    }

    function testCancellationAllowsExactSnapshotBoundaryOnly() external {
        string memory description = "Snapshot cancellation boundary";
        (uint256 proposalId, bytes32 ballotId) = _propose(description);
        (
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory calldatas,
            bytes32 hash
        ) = _proposalData(description);

        vm.roll(governor.proposalSnapshot(proposalId));
        vm.prank(PROPOSER);
        governor.cancelConfidential(targets, values, calldatas, hash);

        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Canceled));
        assertEq(uint8(core.detailedState(ballotId)), uint8(DetailedState.Canceled));
    }

    function testUnknownDetailedStateIsUninitialized() external view {
        assertEq(
            uint8(governor.confidentialState(123)), uint8(ConfidentialProposalState.Uninitialized)
        );
    }

    function _expectQueueState(
        uint256 proposalId,
        string memory description,
        IGovernor.ProposalState actualState
    ) private {
        (
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory calldatas,
            bytes32 hash
        ) = _proposalData(description);
        bytes32 expectedStates = bytes32(uint256(1) << uint8(IGovernor.ProposalState.Succeeded));
        vm.expectRevert(
            abi.encodeWithSelector(
                IGovernor.GovernorUnexpectedProposalState.selector,
                proposalId,
                actualState,
                expectedStates
            )
        );
        governor.queue(targets, values, calldatas, hash);
    }
}
