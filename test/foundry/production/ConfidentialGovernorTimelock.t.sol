// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { IAccessControl } from "@openzeppelin/contracts/access/IAccessControl.sol";
import { IGovernor } from "@openzeppelin/contracts/governance/IGovernor.sol";
import { TimelockController } from "@openzeppelin/contracts/governance/TimelockController.sol";
import {
    ConfidentialProposalState
} from "../../../src/contracts/types/GovernorGovernanceTypes.sol";
import {
    GovernorActionTargetFixture,
    GovernorFixture,
    TimestampGovernorFixture
} from "./fixtures/GovernorFixtures.sol";

contract ConfidentialGovernorTimelockTest is GovernorFixture {
    function testTimelockAuthorityIsGovernorOnlyWithPermissionlessExecution() external {
        bytes32 adminRole = timelock.DEFAULT_ADMIN_ROLE();
        bytes32 proposerRole = timelock.PROPOSER_ROLE();
        bytes32 cancellerRole = timelock.CANCELLER_ROLE();
        bytes32 executorRole = timelock.EXECUTOR_ROLE();

        assertTrue(timelock.hasRole(adminRole, address(timelock)));
        assertFalse(timelock.hasRole(adminRole, address(this)));
        assertTrue(timelock.hasRole(proposerRole, address(governor)));
        assertTrue(timelock.hasRole(cancellerRole, address(governor)));
        assertTrue(timelock.hasRole(executorRole, address(0)));
        assertFalse(timelock.hasRole(proposerRole, address(this)));
        assertFalse(timelock.hasRole(cancellerRole, address(this)));
        assertFalse(timelock.hasRole(proposerRole, OUTSIDER));
        assertFalse(timelock.hasRole(cancellerRole, OUTSIDER));

        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, address(this), adminRole
            )
        );
        timelock.grantRole(proposerRole, OUTSIDER);

        uint256 minDelay = timelock.getMinDelay();
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, OUTSIDER, proposerRole
            )
        );
        vm.prank(OUTSIDER);
        timelock.schedule(
            address(actionTarget),
            0,
            abi.encodeCall(GovernorActionTargetFixture.setValue, (404)),
            bytes32(0),
            keccak256("unauthorized schedule"),
            minDelay
        );
    }

    function testPassedSingleActionQueuesWaitsAndExecutesPermissionlessly() external {
        string memory description = "Passed single timelock action";
        (
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory calldatas,
            bytes32 descriptionHash
        ) = _proposalData(description);
        (uint256 proposalId,) =
            _passProposal(targets, values, calldatas, description, descriptionHash);

        uint256 queuedId = governor.queue(targets, values, calldatas, descriptionHash);
        uint256 eta = governor.proposalEta(proposalId);

        assertEq(queuedId, proposalId);
        assertEq(eta, block.timestamp + timelock.getMinDelay());
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Queued));
        assertEq(actionTarget.value(), 0);

        vm.warp(eta - 1);
        bytes32 operationId = timelock.hashOperationBatch(
            targets,
            values,
            calldatas,
            bytes32(0),
            bytes32(bytes20(address(governor))) ^ descriptionHash
        );
        vm.expectRevert(
            abi.encodeWithSelector(
                TimelockController.TimelockUnexpectedOperationState.selector,
                operationId,
                bytes32(uint256(1) << uint8(TimelockController.OperationState.Ready))
            )
        );
        vm.prank(OUTSIDER);
        governor.execute(targets, values, calldatas, descriptionHash);

        vm.warp(eta);
        vm.prank(OUTSIDER);
        uint256 executedId = governor.execute(targets, values, calldatas, descriptionHash);

        assertEq(executedId, proposalId);
        assertEq(actionTarget.value(), 99);
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Executed));
        assertEq(
            uint8(governor.confidentialState(proposalId)), uint8(ConfidentialProposalState.Executed)
        );
    }

    function testPassedMultiActionQueuesAndExecutesAsOneBatch() external {
        GovernorActionTargetFixture secondTarget = new GovernorActionTargetFixture();
        string memory description = "Passed timelock batch";
        bytes32 descriptionHash = keccak256(bytes(description));
        address[] memory targets = new address[](2);
        uint256[] memory values = new uint256[](2);
        bytes[] memory calldatas = new bytes[](2);
        targets[0] = address(actionTarget);
        targets[1] = address(secondTarget);
        calldatas[0] = abi.encodeCall(GovernorActionTargetFixture.setValue, (11));
        calldatas[1] = abi.encodeCall(GovernorActionTargetFixture.setValue, (22));

        (uint256 proposalId,) =
            _passProposal(targets, values, calldatas, description, descriptionHash);
        governor.queue(targets, values, calldatas, descriptionHash);

        bytes32 operationId = timelock.hashOperationBatch(
            targets,
            values,
            calldatas,
            bytes32(0),
            bytes32(bytes20(address(governor))) ^ descriptionHash
        );
        assertTrue(timelock.isOperationPending(operationId));
        assertEq(actionTarget.value(), 0);
        assertEq(secondTarget.value(), 0);

        vm.warp(governor.proposalEta(proposalId));
        vm.prank(OUTSIDER);
        governor.execute(targets, values, calldatas, descriptionHash);

        assertTrue(timelock.isOperationDone(operationId));
        assertEq(actionTarget.value(), 11);
        assertEq(secondTarget.value(), 22);
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Executed));
    }

    function testDirectTimelockCancellationCannotInterfereWithQueuedProposal() external {
        string memory description = "Protected timelock queue";
        (
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory calldatas,
            bytes32 descriptionHash
        ) = _proposalData(description);
        (uint256 proposalId,) =
            _passProposal(targets, values, calldatas, description, descriptionHash);
        governor.queue(targets, values, calldatas, descriptionHash);

        bytes32 operationId = timelock.hashOperationBatch(
            targets,
            values,
            calldatas,
            bytes32(0),
            bytes32(bytes20(address(governor))) ^ descriptionHash
        );
        bytes32 cancellerRole = timelock.CANCELLER_ROLE();

        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, OUTSIDER, cancellerRole
            )
        );
        vm.prank(OUTSIDER);
        timelock.cancel(operationId);

        assertTrue(timelock.isOperationPending(operationId));
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Queued));
    }

    function testTimelockDelayChangesOnlyThroughGovernanceExecution() external {
        uint256 newDelay = 2 days;
        vm.expectRevert(
            abi.encodeWithSelector(TimelockController.TimelockUnauthorizedCaller.selector, OUTSIDER)
        );
        vm.prank(OUTSIDER);
        timelock.updateDelay(newDelay);

        string memory description = "Governed timelock delay";
        bytes32 descriptionHash = keccak256(bytes(description));
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        targets[0] = address(timelock);
        calldatas[0] = abi.encodeCall(TimelockController.updateDelay, (newDelay));

        (uint256 proposalId,) =
            _passProposal(targets, values, calldatas, description, descriptionHash);
        governor.queue(targets, values, calldatas, descriptionHash);
        vm.warp(governor.proposalEta(proposalId));
        vm.prank(OUTSIDER);
        governor.execute(targets, values, calldatas, descriptionHash);

        assertEq(timelock.getMinDelay(), newDelay);
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Executed));
    }

    function _passProposal(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        bytes32 descriptionHash
    ) private returns (uint256 proposalId, bytes32 ballotId) {
        assertEq(descriptionHash, keccak256(bytes(description)));
        vm.prank(PROPOSER);
        (proposalId, ballotId) =
            governor.proposeConfidential(targets, values, calldatas, description, PRIVACY_FLOOR);
        _openAndCast(proposalId, ballotId, 4);
        _close(proposalId);
        core.requestTally(ballotId);
        _finalize(ballotId, true);
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Succeeded));
    }
}

contract ConfidentialGovernorTimestampTest is TimestampGovernorFixture {
    function testTimestampClockControlsLifecycleAndTimelockExecution() external {
        assertEq(governor.confidentialClockMode(), "mode=timestamp");
        uint48 proposalClock = governor.confidentialClock();
        uint256 originalBlock = block.number;
        string memory description = "Timestamp governed execution";
        (
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory calldatas,
            bytes32 descriptionHash
        ) = _proposalData(description);

        vm.prank(PROPOSER);
        (uint256 proposalId, bytes32 ballotId) =
            governor.proposeConfidential(targets, values, calldatas, description, PRIVACY_FLOOR);
        assertEq(governor.proposalSnapshot(proposalId), proposalClock + VOTING_DELAY);

        vm.roll(originalBlock + 1_000);
        assertEq(governor.confidentialClock(), proposalClock);
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Pending));
        assertEq(
            uint8(governor.confidentialState(proposalId)),
            uint8(ConfidentialProposalState.Scheduled)
        );

        _openAndCast(proposalId, ballotId, 4);
        _close(proposalId);
        core.requestTally(ballotId);
        _finalize(ballotId, true);
        governor.queue(targets, values, calldatas, descriptionHash);

        uint256 eta = governor.proposalEta(proposalId);
        bytes32 operationId = timelock.hashOperationBatch(
            targets,
            values,
            calldatas,
            bytes32(0),
            bytes32(bytes20(address(governor))) ^ descriptionHash
        );
        vm.warp(eta - 1);
        vm.expectRevert(
            abi.encodeWithSelector(
                TimelockController.TimelockUnexpectedOperationState.selector,
                operationId,
                bytes32(uint256(1) << uint8(TimelockController.OperationState.Ready))
            )
        );
        vm.prank(OUTSIDER);
        governor.execute(targets, values, calldatas, descriptionHash);

        vm.warp(eta);
        vm.prank(OUTSIDER);
        governor.execute(targets, values, calldatas, descriptionHash);

        assertEq(actionTarget.value(), 99);
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Executed));
        assertEq(
            uint8(governor.confidentialState(proposalId)), uint8(ConfidentialProposalState.Executed)
        );
    }
}
