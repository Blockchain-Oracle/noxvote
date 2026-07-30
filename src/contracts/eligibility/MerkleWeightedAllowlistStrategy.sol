// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { MerkleProof } from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import { IEligibilityStrategy } from "../interfaces/IEligibilityStrategy.sol";
import {
    InvalidEligibilityConfigLength,
    InvalidEligibilityHost,
    InvalidEligibilityProof,
    InvalidEligibilityProofEncoding,
    InvalidEligibilityVoter,
    InvalidEligibleCount,
    InvalidMerkleRoot,
    InvalidSnapshotId,
    WrongEligibilityChain,
    ZeroEligibilityWeight
} from "../types/EligibilityErrors.sol";

contract MerkleWeightedAllowlistStrategy is IEligibilityStrategy {
    bytes32 public constant LEAF_TYPEHASH = keccak256(
        "ConfidentialVotingEligibility(uint256 chainId,address host,bytes32 snapshotId,address voter,uint256 weight)"
    );
    uint256 private constant CONFIG_LENGTH = 160;
    uint256 private constant MINIMUM_PROOF_LENGTH = 96;

    struct Config {
        bytes32 root;
        bytes32 snapshotId;
        uint32 eligibleCount;
        uint256 chainId;
        address host;
    }

    function validateConfig(bytes calldata config) external view returns (uint32 eligibleCount) {
        return _validatedConfig(config).eligibleCount;
    }

    function weightOf(address voter, uint48, bytes calldata config, bytes calldata proof)
        external
        view
        returns (uint256 weight)
    {
        if (voter == address(0)) revert InvalidEligibilityVoter();
        Config memory decoded = _validatedConfig(config);
        if (proof.length < MINIMUM_PROOF_LENGTH) {
            revert InvalidEligibilityProofEncoding(proof.length);
        }

        bytes32[] memory siblings;
        (weight, siblings) = abi.decode(proof, (uint256, bytes32[]));
        if (keccak256(proof) != keccak256(abi.encode(weight, siblings))) {
            revert InvalidEligibilityProofEncoding(proof.length);
        }
        if (weight == 0) revert ZeroEligibilityWeight(voter);

        bytes32 leaf = leafFor(decoded.chainId, decoded.host, decoded.snapshotId, voter, weight);
        if (!MerkleProof.verify(siblings, decoded.root, leaf)) {
            revert InvalidEligibilityProof(voter);
        }
    }

    function leafFor(
        uint256 chainId,
        address host,
        bytes32 snapshotId,
        address voter,
        uint256 weight
    ) public pure returns (bytes32) {
        bytes32 inner = keccak256(
            abi.encode(LEAF_TYPEHASH, chainId, host, snapshotId, voter, weight)
        );
        return keccak256(bytes.concat(inner));
    }

    function _validatedConfig(bytes calldata config) private view returns (Config memory decoded) {
        if (config.length != CONFIG_LENGTH) {
            revert InvalidEligibilityConfigLength(CONFIG_LENGTH, config.length);
        }
        (decoded.root, decoded.snapshotId, decoded.eligibleCount, decoded.chainId, decoded.host) =
            abi.decode(config, (bytes32, bytes32, uint32, uint256, address));

        if (decoded.root == bytes32(0)) revert InvalidMerkleRoot();
        if (decoded.snapshotId == bytes32(0)) revert InvalidSnapshotId();
        if (decoded.eligibleCount == 0) revert InvalidEligibleCount();
        if (decoded.chainId != block.chainid) {
            revert WrongEligibilityChain(block.chainid, decoded.chainId);
        }
        if (decoded.host == address(0)) revert InvalidEligibilityHost();
    }
}
