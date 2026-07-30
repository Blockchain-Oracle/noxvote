// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { ConfidentialBallotCore } from "../core/ConfidentialBallotCore.sol";
import { SafeConfidentialVotingModule } from "../safe/SafeConfidentialVotingModule.sol";
import {
    ConfidentialGovernanceFactoryDependencies
} from "./ConfidentialGovernanceFactoryDependencies.sol";

abstract contract ConfidentialGovernanceFactorySafe is ConfidentialGovernanceFactoryDependencies {
    bytes32 public constant SAFE_MODULE_CREATION_CODE_HASH =
        0xf2db65301dd9ad0ee89d4832aa13eb9b45bf7f0c274c7f6155f8e4b824d88a7c;

    event SafeModuleDeployed(
        uint16 indexed contractVersion,
        address indexed safe,
        address indexed module,
        address core,
        uint32 organizationMinimumPrivacyFloor,
        address ivotesSnapshotStrategy,
        address merkleWeightedAllowlistStrategy,
        address multiSendCallOnly
    );
    event SafeDeploymentCodeHashes(
        address indexed module,
        bytes32 safeModuleCreationCodeHash,
        bytes32 safeCodeHash,
        bytes32 moduleCodeHash,
        bytes32 coreCodeHash,
        bytes32 ivotesSnapshotStrategyCodeHash,
        bytes32 merkleWeightedAllowlistStrategyCodeHash,
        bytes32 multiSendCallOnlyCodeHash
    );

    constructor(address multiSendCallOnly_)
        ConfidentialGovernanceFactoryDependencies(multiSendCallOnly_)
    { }

    function deploySafeModule(
        address safe,
        uint32 organizationMinimumPrivacyFloor,
        bytes calldata safeModuleCreationCode
    ) external returns (SafeConfidentialVotingModule module, ConfidentialBallotCore core) {
        _validateCreationCode(SAFE_MODULE_CREATION_CODE_HASH, safeModuleCreationCode);
        _validateSharedDependencies();

        bytes memory initCode = bytes.concat(
            safeModuleCreationCode,
            abi.encode(
                safe,
                address(ivotesSnapshotStrategy),
                address(merkleWeightedAllowlistStrategy),
                organizationMinimumPrivacyFloor,
                multiSendCallOnly
            )
        );
        module = SafeConfidentialVotingModule(_deployContract(initCode));
        core = module.confidentialCore();

        emit SafeModuleDeployed(
            _contractVersion(),
            safe,
            address(module),
            address(core),
            organizationMinimumPrivacyFloor,
            address(ivotesSnapshotStrategy),
            address(merkleWeightedAllowlistStrategy),
            multiSendCallOnly
        );
        emit SafeDeploymentCodeHashes(
            address(module),
            SAFE_MODULE_CREATION_CODE_HASH,
            safe.codehash,
            address(module).codehash,
            address(core).codehash,
            ivotesSnapshotStrategyCodeHash,
            merkleWeightedAllowlistStrategyCodeHash,
            multiSendCallOnlyCodeHash
        );
    }
}
