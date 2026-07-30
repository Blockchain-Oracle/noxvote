// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { IGovernor } from "@openzeppelin/contracts/governance/IGovernor.sol";
import { TimelockController } from "@openzeppelin/contracts/governance/TimelockController.sol";
import { IVotes } from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import { ConfidentialBallotCore } from "../../../src/contracts/core/ConfidentialBallotCore.sol";
import { ConfidentialGovernor } from "../../../src/contracts/governor/ConfidentialGovernor.sol";
import {
    FactoryCreationCodeHashMismatch,
    FactoryDependencyCodeHashMismatch,
    FactoryInvalidGovernorToken
} from "../../../src/contracts/types/FactoryGovernanceErrors.sol";
import { GovernorDeploymentConfig } from "../../../src/contracts/types/FactoryGovernanceTypes.sol";
import { GovernorFactoryFixture } from "./fixtures/GovernorFactoryFixtures.sol";

contract ConfidentialGovernanceFactoryGovernorTest is GovernorFactoryFixture {
    function testPublishesReviewedGovernorAndTimelockCreationCodeHashes() external view {
        assertEq(
            factory.GOVERNOR_CREATION_CODE_HASH(),
            keccak256(type(ConfidentialGovernor).creationCode)
        );
        assertEq(
            factory.TIMELOCK_CREATION_CODE_HASH(), keccak256(type(TimelockController).creationCode)
        );
    }

    function testPermissionlessDeploymentBindsStackAuthorityAndCompleteEvidence() external {
        GovernorDeploymentConfig memory config = _defaultConfig();
        vm.recordLogs();
        vm.prank(DEPLOYER);
        (ConfidentialGovernor governor, TimelockController timelock, ConfidentialBallotCore core) =
            _deploy(config);

        _assertBinding(governor, timelock, core, config);
        _assertAuthority(governor, timelock);
        _assertFactoryEvents(vm.getRecordedLogs(), governor, timelock, core, config);

        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        targets[0] = address(0xCAFE);
        calldatas[0] = abi.encodeWithSignature("setValue(uint256)", 7);
        vm.prank(PROPOSER);
        (uint256 proposalId, bytes32 ballotId) = governor.proposeConfidential(
            targets, values, calldatas, "Factory deployed proposal", config.minimumPrivacyFloor
        );

        assertNotEq(ballotId, bytes32(0));
        assertEq(governor.ballotOfProposal(proposalId), ballotId);
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Pending));
    }

    function testCreatesDistinctImmutableStacksWithSharedReviewedStrategies() external {
        GovernorDeploymentConfig memory config = _defaultConfig();
        (
            ConfidentialGovernor first,
            TimelockController firstTimelock,
            ConfidentialBallotCore firstCore
        ) = _deploy(config);
        config.name = "Second Confidential Governor";
        (
            ConfidentialGovernor second,
            TimelockController secondTimelock,
            ConfidentialBallotCore secondCore
        ) = _deploy(config);

        assertNotEq(address(first), address(second));
        assertNotEq(address(firstTimelock), address(secondTimelock));
        assertNotEq(address(firstCore), address(secondCore));
        assertEq(firstCore.host(), address(first));
        assertEq(secondCore.host(), address(second));
        assertEq(firstCore.firstEligibilityStrategy(), secondCore.firstEligibilityStrategy());
        assertEq(firstCore.secondEligibilityStrategy(), secondCore.secondEligibilityStrategy());
    }

    function testRejectsUnreviewedGovernorCreationCode() external {
        bytes memory unreviewed = hex"60006000F3";
        vm.expectRevert(
            abi.encodeWithSelector(
                FactoryCreationCodeHashMismatch.selector,
                factory.GOVERNOR_CREATION_CODE_HASH(),
                keccak256(unreviewed)
            )
        );
        factory.deployGovernor(_defaultConfig(), unreviewed, type(TimelockController).creationCode);
    }

    function testRejectsUnreviewedTimelockCreationCode() external {
        bytes memory unreviewed = hex"60006000F3";
        vm.expectRevert(
            abi.encodeWithSelector(
                FactoryCreationCodeHashMismatch.selector,
                factory.TIMELOCK_CREATION_CODE_HASH(),
                keccak256(unreviewed)
            )
        );
        factory.deployGovernor(
            _defaultConfig(), type(ConfidentialGovernor).creationCode, unreviewed
        );
    }

    function testRejectsInvalidGovernorTokenBeforeDeployment() external {
        GovernorDeploymentConfig memory config = _defaultConfig();
        config.token = IVotes(address(0xBADC0DE));
        vm.expectRevert(
            abi.encodeWithSelector(FactoryInvalidGovernorToken.selector, address(0xBADC0DE))
        );
        _deploy(config);
    }

    function testRejectsSharedStrategyRuntimeDriftBeforeDeployment() external {
        address strategy = address(factory.ivotesSnapshotStrategy());
        bytes32 expected = factory.ivotesSnapshotStrategyCodeHash();
        vm.etch(strategy, hex"00");
        vm.expectRevert(
            abi.encodeWithSelector(
                FactoryDependencyCodeHashMismatch.selector, strategy, expected, strategy.codehash
            )
        );
        _deploy(_defaultConfig());
    }

    function testGovernorConstructionFailureRollsBackEntireStack() external {
        GovernorDeploymentConfig memory config = _defaultConfig();
        config.initialVotingPeriod = 0;
        uint64 factoryNonce = vm.getNonce(address(factory));

        vm.expectRevert(abi.encodeWithSelector(IGovernor.GovernorInvalidVotingPeriod.selector, 0));
        _deploy(config);
        assertEq(vm.getNonce(address(factory)), factoryNonce);

        config.initialVotingPeriod = 10;
        (, TimelockController timelock,) = _deploy(config);
        assertEq(address(timelock), vm.computeCreateAddress(address(factory), factoryNonce));
    }
}
