// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { IVotesSnapshotStrategy } from "../eligibility/IVotesSnapshotStrategy.sol";
import {
    MerkleWeightedAllowlistStrategy
} from "../eligibility/MerkleWeightedAllowlistStrategy.sol";
import { ConfidentialGovernanceVersion } from "../libraries/ConfidentialGovernanceVersion.sol";
import {
    FactoryCreationCodeHashMismatch,
    FactoryDependencyCodeHashMismatch
} from "../types/FactoryGovernanceErrors.sol";
import { InvalidMultiSendCallOnlyAddress } from "../types/SafeGovernanceErrors.sol";

abstract contract ConfidentialGovernanceFactoryDependencies {
    IVotesSnapshotStrategy public immutable ivotesSnapshotStrategy;
    MerkleWeightedAllowlistStrategy public immutable merkleWeightedAllowlistStrategy;
    address public immutable multiSendCallOnly;

    bytes32 public immutable ivotesSnapshotStrategyCodeHash;
    bytes32 public immutable merkleWeightedAllowlistStrategyCodeHash;
    bytes32 public immutable multiSendCallOnlyCodeHash;

    constructor(address multiSendCallOnly_) {
        if (multiSendCallOnly_ == address(0) || multiSendCallOnly_.code.length == 0) {
            revert InvalidMultiSendCallOnlyAddress(multiSendCallOnly_);
        }

        IVotesSnapshotStrategy ivotesStrategy = new IVotesSnapshotStrategy();
        MerkleWeightedAllowlistStrategy merkleStrategy = new MerkleWeightedAllowlistStrategy();
        ivotesSnapshotStrategy = ivotesStrategy;
        merkleWeightedAllowlistStrategy = merkleStrategy;
        multiSendCallOnly = multiSendCallOnly_;
        ivotesSnapshotStrategyCodeHash = address(ivotesStrategy).codehash;
        merkleWeightedAllowlistStrategyCodeHash = address(merkleStrategy).codehash;
        multiSendCallOnlyCodeHash = multiSendCallOnly_.codehash;
    }

    function contractVersion() external pure returns (uint16) {
        return _contractVersion();
    }

    function rulesVersion() external pure returns (uint16) {
        return ConfidentialGovernanceVersion.RULES_VERSION;
    }

    function _contractVersion() internal pure returns (uint16) {
        return ConfidentialGovernanceVersion.CONTRACT_VERSION;
    }

    function _validateSharedDependencies() internal view {
        _validateDependency(address(ivotesSnapshotStrategy), ivotesSnapshotStrategyCodeHash);
        _validateDependency(
            address(merkleWeightedAllowlistStrategy), merkleWeightedAllowlistStrategyCodeHash
        );
        _validateDependency(multiSendCallOnly, multiSendCallOnlyCodeHash);
    }

    function _validateCreationCode(bytes32 expected, bytes calldata creationCode) internal pure {
        bytes32 actual = keccak256(creationCode);
        if (actual != expected) revert FactoryCreationCodeHashMismatch(expected, actual);
    }

    function _deployContract(bytes memory initCode) internal returns (address deployed) {
        assembly ("memory-safe") {
            deployed := create(0, add(initCode, 0x20), mload(initCode))
            if iszero(deployed) {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        }
    }

    function _validateDependency(address dependency, bytes32 expectedCodeHash) private view {
        bytes32 actualCodeHash = dependency.codehash;
        if (actualCodeHash != expectedCodeHash) {
            revert FactoryDependencyCodeHashMismatch(dependency, expectedCodeHash, actualCodeHash);
        }
    }
}
