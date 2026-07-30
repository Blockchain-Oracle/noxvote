// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { SafeAction, SafeBallotConfig } from "../../../src/contracts/types/SafeGovernanceTypes.sol";
import { OrderedSafeExecutionTarget } from "./fixtures/SafeBatchExecutionFixtures.sol";
import {
    DirectSafeExecutionTarget,
    SafeExecutionFixture
} from "./fixtures/SafeExecutionFixtures.sol";
import { GovernorActionTargetFixture, GovernorFixture } from "./fixtures/GovernorFixtures.sol";

contract SafeConfidentialVotingModuleGasTest is SafeExecutionFixture {
    uint256 private constant DIRECT_EXECUTE_BASELINE = 86_074;
    uint256 private constant TWO_CALL_BATCH_EXECUTE_BASELINE = 168_745;

    function testSafeDirectExecutionGas() external {
        DirectSafeExecutionTarget target = new DirectSafeExecutionTarget();
        SafeAction[] memory actions =
            _singleAction(address(target), 1 ether, abi.encodeCall(target.setValue, (42)));
        (bytes32 safeProposalId, bytes32 ballotId, SafeBallotConfig memory config) =
            _register(actions);
        _finalize(ballotId, config, true);

        vm.prank(KEEPER);
        uint256 gasBefore = gasleft();
        module.execute(safeProposalId, actions);
        uint256 gasUsed = gasBefore - gasleft();

        emit log_named_uint("Safe direct execute gas", gasUsed);
        _assertWithinRegressionLimit(gasUsed, DIRECT_EXECUTE_BASELINE);
    }

    function testSafeTwoCallBatchExecutionGas() external {
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

        vm.prank(KEEPER);
        uint256 gasBefore = gasleft();
        module.execute(safeProposalId, actions);
        uint256 gasUsed = gasBefore - gasleft();

        emit log_named_uint("Safe two-call batch execute gas", gasUsed);
        _assertWithinRegressionLimit(gasUsed, TWO_CALL_BATCH_EXECUTE_BASELINE);
    }

    function _assertWithinRegressionLimit(uint256 gasUsed, uint256 baseline) private pure {
        assertLe(gasUsed, (baseline * 120) / 100);
    }
}

contract ConfidentialGovernorGasTest is GovernorFixture {
    uint256 private constant SINGLE_ACTION_QUEUE_BASELINE = 102_732;
    uint256 private constant SINGLE_ACTION_EXECUTE_BASELINE = 52_792;
    uint256 private constant TWO_ACTION_QUEUE_BASELINE = 110_983;
    uint256 private constant TWO_ACTION_EXECUTE_BASELINE = 82_366;

    function testGovernorSingleActionQueueAndExecuteGas() external {
        string memory description = "Gas single timelock action";
        (
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory calldatas,
            bytes32 descriptionHash
        ) = _proposalData(description);
        uint256 proposalId =
            _preparePassedProposal(targets, values, calldatas, description, descriptionHash);

        (uint256 queueGas, uint256 executeGas) =
            _measureQueueAndExecute(proposalId, targets, values, calldatas, descriptionHash);

        emit log_named_uint("Governor single-action queue gas", queueGas);
        emit log_named_uint("Governor single-action execute gas", executeGas);
        _assertWithinRegressionLimit(queueGas, SINGLE_ACTION_QUEUE_BASELINE);
        _assertWithinRegressionLimit(executeGas, SINGLE_ACTION_EXECUTE_BASELINE);
    }

    function testGovernorTwoActionQueueAndExecuteGas() external {
        GovernorActionTargetFixture secondTarget = new GovernorActionTargetFixture();
        string memory description = "Gas two-action timelock batch";
        bytes32 descriptionHash = keccak256(bytes(description));
        address[] memory targets = new address[](2);
        uint256[] memory values = new uint256[](2);
        bytes[] memory calldatas = new bytes[](2);
        targets[0] = address(actionTarget);
        targets[1] = address(secondTarget);
        calldatas[0] = abi.encodeCall(GovernorActionTargetFixture.setValue, (11));
        calldatas[1] = abi.encodeCall(GovernorActionTargetFixture.setValue, (22));
        uint256 proposalId =
            _preparePassedProposal(targets, values, calldatas, description, descriptionHash);

        (uint256 queueGas, uint256 executeGas) =
            _measureQueueAndExecute(proposalId, targets, values, calldatas, descriptionHash);

        emit log_named_uint("Governor two-action queue gas", queueGas);
        emit log_named_uint("Governor two-action execute gas", executeGas);
        _assertWithinRegressionLimit(queueGas, TWO_ACTION_QUEUE_BASELINE);
        _assertWithinRegressionLimit(executeGas, TWO_ACTION_EXECUTE_BASELINE);
    }

    function _preparePassedProposal(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        bytes32 descriptionHash
    ) private returns (uint256 proposalId) {
        vm.prank(PROPOSER);
        bytes32 ballotId;
        (proposalId, ballotId) =
            governor.proposeConfidential(targets, values, calldatas, description, PRIVACY_FLOOR);
        assertEq(descriptionHash, keccak256(bytes(description)));
        _openAndCast(proposalId, ballotId, 4);
        _close(proposalId);
        core.requestTally(ballotId);
        _finalize(ballotId, true);
    }

    function _measureQueueAndExecute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) private returns (uint256 queueGas, uint256 executeGas) {
        uint256 gasBefore = gasleft();
        governor.queue(targets, values, calldatas, descriptionHash);
        queueGas = gasBefore - gasleft();

        vm.warp(governor.proposalEta(proposalId));
        vm.prank(OUTSIDER);
        gasBefore = gasleft();
        governor.execute(targets, values, calldatas, descriptionHash);
        executeGas = gasBefore - gasleft();
    }

    function _assertWithinRegressionLimit(uint256 gasUsed, uint256 baseline) private pure {
        assertLe(gasUsed, (baseline * 120) / 100);
    }
}
