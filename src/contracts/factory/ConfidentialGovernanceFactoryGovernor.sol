// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { TimelockController } from "@openzeppelin/contracts/governance/TimelockController.sol";
import { ConfidentialBallotCore } from "../core/ConfidentialBallotCore.sol";
import { ConfidentialGovernor } from "../governor/ConfidentialGovernor.sol";
import {
    FactoryInvalidGovernorToken,
    FactoryTimelockRoleMismatch
} from "../types/FactoryGovernanceErrors.sol";
import { GovernorDeploymentConfig } from "../types/FactoryGovernanceTypes.sol";
import { ConfidentialGovernorConfig } from "../types/GovernorGovernanceTypes.sol";
import { ConfidentialGovernanceFactorySafe } from "./ConfidentialGovernanceFactorySafe.sol";

abstract contract ConfidentialGovernanceFactoryGovernor is ConfidentialGovernanceFactorySafe {
    bytes32 public constant GOVERNOR_CREATION_CODE_HASH =
        0x571bb7cca27e83bde00bd212859994dfcf65f52084eafd5ab21900e394895dbd;
    bytes32 public constant TIMELOCK_CREATION_CODE_HASH =
        0x47f65cb680d9975a35852ab37b8bbb0619387b78478d26ceb9a703b29eead293;

    event GovernorStackDeployed(
        uint16 indexed contractVersion,
        address indexed governor,
        address indexed timelock,
        address core,
        address token,
        bytes32 deploymentConfigHash,
        uint32 organizationMinimumPrivacyFloor,
        address ivotesSnapshotStrategy,
        address merkleWeightedAllowlistStrategy
    );
    event GovernorDeploymentCodeHashes(
        address indexed governor,
        address indexed timelock,
        bytes32 governorCreationCodeHash,
        bytes32 timelockCreationCodeHash,
        bytes32 tokenCodeHash,
        bytes32 governorCodeHash,
        bytes32 timelockCodeHash,
        bytes32 coreCodeHash,
        bytes32 ivotesSnapshotStrategyCodeHash,
        bytes32 merkleWeightedAllowlistStrategyCodeHash
    );

    constructor(address multiSendCallOnly_)
        ConfidentialGovernanceFactorySafe(multiSendCallOnly_)
    { }

    function deployGovernor(
        GovernorDeploymentConfig calldata config,
        bytes calldata governorCreationCode,
        bytes calldata timelockCreationCode
    )
        external
        returns (
            ConfidentialGovernor governor,
            TimelockController timelock,
            ConfidentialBallotCore core
        )
    {
        _validateCreationCode(GOVERNOR_CREATION_CODE_HASH, governorCreationCode);
        _validateCreationCode(TIMELOCK_CREATION_CODE_HASH, timelockCreationCode);
        _validateSharedDependencies();
        address token = address(config.token);
        if (token == address(0) || token.code.length == 0) {
            revert FactoryInvalidGovernorToken(token);
        }

        timelock = _deployTimelock(config.timelockMinDelay, timelockCreationCode);
        governor = _deployGovernor(config, timelock, governorCreationCode);
        core = governor.confidentialCore();
        _configureTimelock(timelock, address(governor));
        _emitGovernorDeployment(config, governor, timelock, core);
    }

    function _deployTimelock(uint256 minDelay, bytes calldata creationCode)
        private
        returns (TimelockController timelock)
    {
        address[] memory noAccounts = new address[](0);
        bytes memory initCode = bytes.concat(
            creationCode, abi.encode(minDelay, noAccounts, noAccounts, address(this))
        );
        timelock = TimelockController(payable(_deployContract(initCode)));
    }

    function _deployGovernor(
        GovernorDeploymentConfig calldata deployment,
        TimelockController timelock,
        bytes calldata creationCode
    ) private returns (ConfidentialGovernor governor) {
        ConfidentialGovernorConfig memory config =
            ConfidentialGovernorConfig({
                name: deployment.name,
                token: deployment.token,
                timelock: timelock,
                initialVotingDelay: deployment.initialVotingDelay,
                initialVotingPeriod: deployment.initialVotingPeriod,
                initialProposalThreshold: deployment.initialProposalThreshold,
                initialQuorumNumerator: deployment.initialQuorumNumerator,
                ivotesStrategy: address(ivotesSnapshotStrategy),
                merkleStrategy: address(merkleWeightedAllowlistStrategy),
                minimumPrivacyFloor: deployment.minimumPrivacyFloor
            });
        governor = ConfidentialGovernor(
            payable(_deployContract(bytes.concat(creationCode, abi.encode(config))))
        );
    }

    function _configureTimelock(TimelockController timelock, address governor) private {
        bytes32 proposer = timelock.PROPOSER_ROLE();
        bytes32 canceller = timelock.CANCELLER_ROLE();
        bytes32 executor = timelock.EXECUTOR_ROLE();
        bytes32 admin = timelock.DEFAULT_ADMIN_ROLE();
        timelock.grantRole(proposer, governor);
        timelock.grantRole(canceller, governor);
        timelock.grantRole(executor, address(0));
        _requireRole(timelock, proposer, governor, true);
        _requireRole(timelock, canceller, governor, true);
        _requireRole(timelock, executor, address(0), true);
        _requireRole(timelock, admin, address(timelock), true);
        timelock.renounceRole(admin, address(this));
        _requireRole(timelock, admin, address(this), false);
    }

    function _requireRole(TimelockController timelock, bytes32 role, address account, bool expected)
        private
        view
    {
        bool actual = timelock.hasRole(role, account);
        if (actual != expected) {
            revert FactoryTimelockRoleMismatch(role, account, expected, actual);
        }
    }

    function _emitGovernorDeployment(
        GovernorDeploymentConfig calldata config,
        ConfidentialGovernor governor,
        TimelockController timelock,
        ConfidentialBallotCore core
    ) private {
        emit GovernorStackDeployed(
            _contractVersion(),
            address(governor),
            address(timelock),
            address(core),
            address(config.token),
            _configHash(config),
            config.minimumPrivacyFloor,
            address(ivotesSnapshotStrategy),
            address(merkleWeightedAllowlistStrategy)
        );
        emit GovernorDeploymentCodeHashes(
            address(governor),
            address(timelock),
            GOVERNOR_CREATION_CODE_HASH,
            TIMELOCK_CREATION_CODE_HASH,
            address(config.token).codehash,
            address(governor).codehash,
            address(timelock).codehash,
            address(core).codehash,
            ivotesSnapshotStrategyCodeHash,
            merkleWeightedAllowlistStrategyCodeHash
        );
    }

    function _configHash(GovernorDeploymentConfig calldata config) private pure returns (bytes32) {
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
