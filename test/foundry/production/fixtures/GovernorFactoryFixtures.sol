// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Test } from "forge-std/Test.sol";
import { Vm } from "forge-std/Vm.sol";
import {
    MultiSendCallOnly
} from "@safe-global/safe-smart-account/contracts/libraries/MultiSendCallOnly.sol";
import { TimelockController } from "@openzeppelin/contracts/governance/TimelockController.sol";
import { IVotes } from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import { ConfidentialBallotCore } from "../../../../src/contracts/core/ConfidentialBallotCore.sol";
import {
    ConfidentialGovernanceFactory
} from "../../../../src/contracts/factory/ConfidentialGovernanceFactory.sol";
import { ConfidentialGovernor } from "../../../../src/contracts/governor/ConfidentialGovernor.sol";
import {
    GovernorDeploymentConfig
} from "../../../../src/contracts/types/FactoryGovernanceTypes.sol";
import { VotesTokenFixture } from "./EligibilityFixtures.sol";

abstract contract GovernorFactoryFixture is Test {
    address internal constant DEPLOYER = address(0xD3F10);
    address internal constant PROPOSER = address(0xA11CE);

    bytes32 private constant GOVERNOR_STACK_DEPLOYED_TOPIC = keccak256(
        "GovernorStackDeployed(uint16,address,address,address,address,bytes32,uint32,address,address)"
    );
    bytes32 private constant GOVERNOR_DEPLOYMENT_CODE_HASHES_TOPIC = keccak256(
        "GovernorDeploymentCodeHashes(address,address,bytes32,bytes32,bytes32,bytes32,bytes32,bytes32,bytes32,bytes32)"
    );

    VotesTokenFixture internal token;
    ConfidentialGovernanceFactory internal factory;

    function setUp() public virtual {
        vm.roll(10);
        token = new VotesTokenFixture();
        token.mint(PROPOSER, 10);
        vm.prank(PROPOSER);
        token.delegate(PROPOSER);
        vm.roll(11);
        factory = new ConfidentialGovernanceFactory(address(new MultiSendCallOnly()));
    }

    function _assertBinding(
        ConfidentialGovernor governor,
        TimelockController timelock,
        ConfidentialBallotCore core,
        GovernorDeploymentConfig memory config
    ) internal view {
        assertEq(governor.name(), config.name);
        assertEq(address(governor.token()), address(config.token));
        assertEq(governor.timelock(), address(timelock));
        assertEq(address(governor.confidentialCore()), address(core));
        assertEq(core.host(), address(governor));
        assertEq(core.firstEligibilityStrategy(), address(factory.ivotesSnapshotStrategy()));
        assertEq(
            core.secondEligibilityStrategy(), address(factory.merkleWeightedAllowlistStrategy())
        );
        assertEq(core.organizationMinimumPrivacyFloor(), config.minimumPrivacyFloor);
        assertEq(governor.votingDelay(), config.initialVotingDelay);
        assertEq(governor.votingPeriod(), config.initialVotingPeriod);
        assertEq(governor.proposalThreshold(), config.initialProposalThreshold);
        assertEq(governor.quorumNumerator(), config.initialQuorumNumerator);
        assertEq(timelock.getMinDelay(), config.timelockMinDelay);
    }

    function _assertAuthority(ConfidentialGovernor governor, TimelockController timelock)
        internal
        view
    {
        bytes32 admin = timelock.DEFAULT_ADMIN_ROLE();
        bytes32 proposer = timelock.PROPOSER_ROLE();
        bytes32 canceller = timelock.CANCELLER_ROLE();
        bytes32 executor = timelock.EXECUTOR_ROLE();
        assertTrue(timelock.hasRole(admin, address(timelock)));
        assertFalse(timelock.hasRole(admin, address(factory)));
        assertFalse(timelock.hasRole(admin, DEPLOYER));
        assertTrue(timelock.hasRole(proposer, address(governor)));
        assertTrue(timelock.hasRole(canceller, address(governor)));
        assertTrue(timelock.hasRole(executor, address(0)));
        assertFalse(timelock.hasRole(proposer, address(factory)));
        assertFalse(timelock.hasRole(canceller, address(factory)));
    }

    function _assertFactoryEvents(
        Vm.Log[] memory logs,
        ConfidentialGovernor governor,
        TimelockController timelock,
        ConfidentialBallotCore core,
        GovernorDeploymentConfig memory config
    ) internal view {
        uint256 matched;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter != address(factory)) continue;
            if (logs[i].topics[0] == GOVERNOR_STACK_DEPLOYED_TOPIC) {
                _assertStackEvent(logs[i], governor, timelock, core, config);
                matched++;
            } else if (logs[i].topics[0] == GOVERNOR_DEPLOYMENT_CODE_HASHES_TOPIC) {
                _assertCodeHashEvent(logs[i], governor, timelock, core);
                matched++;
            }
        }
        assertEq(matched, 2);
    }

    function _assertStackEvent(
        Vm.Log memory entry,
        ConfidentialGovernor governor,
        TimelockController timelock,
        ConfidentialBallotCore core,
        GovernorDeploymentConfig memory config
    ) private view {
        assertEq(uint256(entry.topics[1]), 1);
        assertEq(address(uint160(uint256(entry.topics[2]))), address(governor));
        assertEq(address(uint160(uint256(entry.topics[3]))), address(timelock));
        (
            address emittedCore,
            address emittedToken,
            bytes32 configHash,
            uint32 emittedFloor,
            address ivotesStrategy,
            address merkleStrategy
        ) = abi.decode(entry.data, (address, address, bytes32, uint32, address, address));
        assertEq(emittedCore, address(core));
        assertEq(emittedToken, address(config.token));
        assertEq(configHash, _configHash(config));
        assertEq(emittedFloor, config.minimumPrivacyFloor);
        assertEq(ivotesStrategy, address(factory.ivotesSnapshotStrategy()));
        assertEq(merkleStrategy, address(factory.merkleWeightedAllowlistStrategy()));
    }

    function _assertCodeHashEvent(
        Vm.Log memory entry,
        ConfidentialGovernor governor,
        TimelockController timelock,
        ConfidentialBallotCore core
    ) private view {
        assertEq(address(uint160(uint256(entry.topics[1]))), address(governor));
        assertEq(address(uint160(uint256(entry.topics[2]))), address(timelock));
        bytes32[8] memory hashes = abi.decode(entry.data, (bytes32[8]));
        assertEq(hashes[0], factory.GOVERNOR_CREATION_CODE_HASH());
        assertEq(hashes[1], factory.TIMELOCK_CREATION_CODE_HASH());
        assertEq(hashes[2], address(token).codehash);
        assertEq(hashes[3], address(governor).codehash);
        assertEq(hashes[4], address(timelock).codehash);
        assertEq(hashes[5], address(core).codehash);
        assertEq(hashes[6], factory.ivotesSnapshotStrategyCodeHash());
        assertEq(hashes[7], factory.merkleWeightedAllowlistStrategyCodeHash());
    }

    function _deploy(GovernorDeploymentConfig memory config)
        internal
        returns (
            ConfidentialGovernor governor,
            TimelockController timelock,
            ConfidentialBallotCore core
        )
    {
        return factory.deployGovernor(
            config, type(ConfidentialGovernor).creationCode, type(TimelockController).creationCode
        );
    }

    function _defaultConfig() internal view returns (GovernorDeploymentConfig memory) {
        return GovernorDeploymentConfig({
            name: "Factory Confidential Governor",
            token: IVotes(address(token)),
            timelockMinDelay: 1 days,
            initialVotingDelay: 2,
            initialVotingPeriod: 10,
            initialProposalThreshold: 1,
            initialQuorumNumerator: 20,
            minimumPrivacyFloor: 4
        });
    }

    function _configHash(GovernorDeploymentConfig memory config) private pure returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256(bytes(config.name)),
                address(config.token),
                config.timelockMinDelay,
                config.initialVotingDelay,
                config.initialVotingPeriod,
                config.initialProposalThreshold,
                config.initialQuorumNumerator,
                config.minimumPrivacyFloor
            )
        );
    }
}
