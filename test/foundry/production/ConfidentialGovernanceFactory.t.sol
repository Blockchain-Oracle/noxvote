// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Test } from "forge-std/Test.sol";
import { Vm } from "forge-std/Vm.sol";
import { Safe } from "@safe-global/safe-smart-account/contracts/Safe.sol";
import {
    MultiSendCallOnly
} from "@safe-global/safe-smart-account/contracts/libraries/MultiSendCallOnly.sol";
import { SafeProxy } from "@safe-global/safe-smart-account/contracts/proxies/SafeProxy.sol";
import { ConfidentialBallotCore } from "../../../src/contracts/core/ConfidentialBallotCore.sol";
import {
    ConfidentialGovernanceFactory
} from "../../../src/contracts/factory/ConfidentialGovernanceFactory.sol";
import {
    SafeConfidentialVotingModule
} from "../../../src/contracts/safe/SafeConfidentialVotingModule.sol";
import { InvalidPrivacyFloor } from "../../../src/contracts/types/ConfidentialGovernanceErrors.sol";
import {
    FactoryCreationCodeHashMismatch,
    FactoryDependencyCodeHashMismatch
} from "../../../src/contracts/types/FactoryGovernanceErrors.sol";
import {
    InvalidMultiSendCallOnlyAddress,
    InvalidSafeAddress
} from "../../../src/contracts/types/SafeGovernanceErrors.sol";

contract ConfidentialGovernanceFactoryTest is Test {
    uint256 private constant OWNER_KEY = 0xA11CE;
    address private constant DEPLOYER = address(0xD3F10);

    bytes32 private constant SAFE_MODULE_DEPLOYED_TOPIC = keccak256(
        "SafeModuleDeployed(uint16,address,address,address,uint32,address,address,address)"
    );
    bytes32 private constant SAFE_DEPLOYMENT_CODE_HASHES_TOPIC = keccak256(
        "SafeDeploymentCodeHashes(address,bytes32,bytes32,bytes32,bytes32,bytes32,bytes32,bytes32)"
    );

    Safe private safe;
    MultiSendCallOnly private multiSendCallOnly;
    ConfidentialGovernanceFactory private factory;

    function setUp() public {
        Safe singleton = new Safe();
        safe = Safe(payable(address(new SafeProxy(address(singleton)))));
        address[] memory owners = new address[](1);
        owners[0] = vm.addr(OWNER_KEY);
        safe.setup(owners, 1, address(0), "", address(0), address(0), 0, payable(address(0)));

        multiSendCallOnly = new MultiSendCallOnly();
        factory = new ConfidentialGovernanceFactory(address(multiSendCallOnly));
    }

    function testPublishesVersionStrategiesAndDependencyCodeHashes() public view {
        address ivotesStrategy = address(factory.ivotesSnapshotStrategy());
        address merkleStrategy = address(factory.merkleWeightedAllowlistStrategy());

        assertEq(factory.contractVersion(), 1);
        assertEq(factory.rulesVersion(), 1);
        assertEq(
            factory.SAFE_MODULE_CREATION_CODE_HASH(),
            keccak256(type(SafeConfidentialVotingModule).creationCode)
        );
        assertTrue(ivotesStrategy.code.length != 0);
        assertTrue(merkleStrategy.code.length != 0);
        assertNotEq(ivotesStrategy, merkleStrategy);
        assertEq(factory.multiSendCallOnly(), address(multiSendCallOnly));
        assertEq(factory.ivotesSnapshotStrategyCodeHash(), ivotesStrategy.codehash);
        assertEq(factory.merkleWeightedAllowlistStrategyCodeHash(), merkleStrategy.codehash);
        assertEq(factory.multiSendCallOnlyCodeHash(), address(multiSendCallOnly).codehash);
    }

    function testPermissionlessDeploymentBindsImmutablePairAndCompleteEventEvidence() public {
        vm.recordLogs();
        vm.prank(DEPLOYER);
        (SafeConfidentialVotingModule module, ConfidentialBallotCore core) =
            _deploySafeModule(address(safe), 5);

        assertEq(module.safe(), address(safe));
        assertEq(address(module.confidentialCore()), address(core));
        assertEq(core.host(), address(module));
        assertEq(core.firstEligibilityStrategy(), address(factory.ivotesSnapshotStrategy()));
        assertEq(
            core.secondEligibilityStrategy(), address(factory.merkleWeightedAllowlistStrategy())
        );
        assertEq(core.organizationMinimumPrivacyFloor(), 5);
        assertEq(module.multiSendCallOnly(), address(multiSendCallOnly));
        assertEq(module.multiSendCallOnlyCodeHash(), factory.multiSendCallOnlyCodeHash());
        assertFalse(module.isInstalled());

        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 2);
        _assertDeploymentEvent(logs[0], address(module), address(core), 5);
        _assertCodeHashEvent(logs[1], address(module), address(core));
    }

    function testCreatesDistinctNonUpgradeablePairsWithSharedReviewedDependencies() public {
        (SafeConfidentialVotingModule first, ConfidentialBallotCore firstCore) =
            _deploySafeModule(address(safe), 4);
        (SafeConfidentialVotingModule second, ConfidentialBallotCore secondCore) =
            _deploySafeModule(address(safe), 6);

        assertNotEq(address(first), address(second));
        assertNotEq(address(firstCore), address(secondCore));
        assertEq(firstCore.host(), address(first));
        assertEq(secondCore.host(), address(second));
        assertEq(firstCore.firstEligibilityStrategy(), secondCore.firstEligibilityStrategy());
        assertEq(firstCore.secondEligibilityStrategy(), secondCore.secondEligibilityStrategy());
        assertEq(first.multiSendCallOnly(), second.multiSendCallOnly());
    }

    function testRejectsInvalidFactoryAndModuleConstruction() public {
        vm.expectRevert(
            abi.encodeWithSelector(InvalidMultiSendCallOnlyAddress.selector, address(0))
        );
        new ConfidentialGovernanceFactory(address(0));

        address notAContract = address(0xBADC0DE);
        vm.expectRevert(
            abi.encodeWithSelector(InvalidMultiSendCallOnlyAddress.selector, notAContract)
        );
        new ConfidentialGovernanceFactory(notAContract);

        vm.expectRevert(abi.encodeWithSelector(InvalidSafeAddress.selector, address(0)));
        _deploySafeModule(address(0), 4);

        vm.expectRevert(abi.encodeWithSelector(InvalidPrivacyFloor.selector, uint32(3), uint32(4)));
        _deploySafeModule(address(safe), 3);
    }

    function testRejectsUnreviewedSafeModuleCreationCode() public {
        bytes memory unreviewedCreationCode = hex"60006000F3";
        vm.expectRevert(
            abi.encodeWithSelector(
                FactoryCreationCodeHashMismatch.selector,
                factory.SAFE_MODULE_CREATION_CODE_HASH(),
                keccak256(unreviewedCreationCode)
            )
        );
        factory.deploySafeModule(address(safe), 4, unreviewedCreationCode);
    }

    function testRejectsDependencyRuntimeCodeDriftBeforeDeployment() public {
        address batch = address(multiSendCallOnly);
        bytes32 expectedBatchHash = factory.multiSendCallOnlyCodeHash();
        vm.etch(batch, hex"00");
        vm.expectRevert(
            abi.encodeWithSelector(
                FactoryDependencyCodeHashMismatch.selector, batch, expectedBatchHash, batch.codehash
            )
        );
        _deploySafeModule(address(safe), 4);
    }

    function testRejectsPublishedStrategyRuntimeCodeDriftBeforeDeployment() public {
        address strategy = address(factory.ivotesSnapshotStrategy());
        bytes32 expectedStrategyHash = factory.ivotesSnapshotStrategyCodeHash();
        vm.etch(strategy, hex"00");
        vm.expectRevert(
            abi.encodeWithSelector(
                FactoryDependencyCodeHashMismatch.selector,
                strategy,
                expectedStrategyHash,
                strategy.codehash
            )
        );
        _deploySafeModule(address(safe), 4);
    }

    function _assertDeploymentEvent(
        Vm.Log memory entry,
        address module,
        address core,
        uint32 minimumPrivacyFloor
    ) private view {
        assertEq(entry.emitter, address(factory));
        assertEq(entry.topics[0], SAFE_MODULE_DEPLOYED_TOPIC);
        assertEq(uint256(entry.topics[1]), 1);
        assertEq(address(uint160(uint256(entry.topics[2]))), address(safe));
        assertEq(address(uint160(uint256(entry.topics[3]))), module);
        (
            address emittedCore,
            uint32 emittedMinimum,
            address ivotesStrategy,
            address merkleStrategy,
            address emittedBatch
        ) = abi.decode(entry.data, (address, uint32, address, address, address));
        assertEq(emittedCore, core);
        assertEq(emittedMinimum, minimumPrivacyFloor);
        assertEq(ivotesStrategy, address(factory.ivotesSnapshotStrategy()));
        assertEq(merkleStrategy, address(factory.merkleWeightedAllowlistStrategy()));
        assertEq(emittedBatch, address(multiSendCallOnly));
    }

    function _assertCodeHashEvent(Vm.Log memory entry, address module, address core) private view {
        assertEq(entry.emitter, address(factory));
        assertEq(entry.topics[0], SAFE_DEPLOYMENT_CODE_HASHES_TOPIC);
        assertEq(address(uint160(uint256(entry.topics[1]))), module);
        (
            bytes32 safeModuleCreationCodeHash,
            bytes32 safeCodeHash,
            bytes32 moduleCodeHash,
            bytes32 coreCodeHash,
            bytes32 ivotesStrategyCodeHash,
            bytes32 merkleStrategyCodeHash,
            bytes32 batchCodeHash
        ) = abi.decode(entry.data, (bytes32, bytes32, bytes32, bytes32, bytes32, bytes32, bytes32));
        assertEq(safeModuleCreationCodeHash, factory.SAFE_MODULE_CREATION_CODE_HASH());
        assertEq(safeCodeHash, address(safe).codehash);
        assertEq(moduleCodeHash, module.codehash);
        assertEq(coreCodeHash, core.codehash);
        assertEq(ivotesStrategyCodeHash, factory.ivotesSnapshotStrategyCodeHash());
        assertEq(merkleStrategyCodeHash, factory.merkleWeightedAllowlistStrategyCodeHash());
        assertEq(batchCodeHash, factory.multiSendCallOnlyCodeHash());
    }

    function _deploySafeModule(address safe_, uint32 minimumPrivacyFloor)
        private
        returns (SafeConfidentialVotingModule module, ConfidentialBallotCore core)
    {
        return factory.deploySafeModule(
            safe_, minimumPrivacyFloor, type(SafeConfidentialVotingModule).creationCode
        );
    }
}
