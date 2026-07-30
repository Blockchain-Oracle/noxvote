// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

error InvalidEligibilityConfigLength(uint256 expected, uint256 actual);
error InvalidEligibilityToken(address token);
error EmptyEligibilityProofRequired(uint256 actualLength);
error InvalidEligibilityVoter();
error ZeroEligibilityWeight(address voter);
error InvalidMerkleRoot();
error InvalidSnapshotId();
error InvalidEligibleCount();
error WrongEligibilityChain(uint256 expected, uint256 provided);
error InvalidEligibilityHost();
error InvalidEligibilityProofEncoding(uint256 actualLength);
error InvalidEligibilityProof(address voter);
