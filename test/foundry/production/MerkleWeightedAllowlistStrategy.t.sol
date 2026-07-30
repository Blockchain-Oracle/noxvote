// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Test } from "forge-std/Test.sol";
import { Hashes } from "@openzeppelin/contracts/utils/cryptography/Hashes.sol";
import {
    InvalidEligibilityConfigLength,
    InvalidEligibilityHost,
    InvalidEligibilityProof,
    InvalidEligibilityProofEncoding,
    InvalidEligibleCount,
    InvalidMerkleRoot,
    InvalidSnapshotId,
    WrongEligibilityChain,
    ZeroEligibilityWeight
} from "../../../src/contracts/types/EligibilityErrors.sol";
import {
    MerkleWeightedAllowlistStrategy
} from "../../../src/contracts/eligibility/MerkleWeightedAllowlistStrategy.sol";

contract MerkleWeightedAllowlistStrategyTest is Test {
    address private constant HOST = address(0x5AFE);
    address private constant OTHER_HOST = address(0xBAD);
    address private constant VOTER_A = address(0xA11CE);
    address private constant VOTER_B = address(0xB0B);
    bytes32 private constant SNAPSHOT_ID = keccak256("safe-owner-snapshot-1");

    MerkleWeightedAllowlistStrategy private strategy;
    bytes32 private leafA;
    bytes32 private leafB;
    bytes32 private root;

    function setUp() external {
        vm.chainId(31_337);
        strategy = new MerkleWeightedAllowlistStrategy();
        leafA = strategy.leafFor(block.chainid, HOST, SNAPSHOT_ID, VOTER_A, 5);
        leafB = strategy.leafFor(block.chainid, HOST, SNAPSHOT_ID, VOTER_B, 3);
        root = Hashes.commutativeKeccak256(leafA, leafB);
    }

    function testValidatesConfigAndReturnsProvenWeight() external view {
        bytes memory config = _config(root, SNAPSHOT_ID, 2, block.chainid, HOST);
        bytes32[] memory siblings = new bytes32[](1);
        siblings[0] = leafB;

        assertEq(strategy.validateConfig(config), 2);
        assertEq(strategy.weightOf(VOTER_A, 0, config, abi.encode(uint256(5), siblings)), 5);
    }

    function testRejectsWrongVoterWeightAndSibling() external {
        bytes memory config = _config(root, SNAPSHOT_ID, 2, block.chainid, HOST);
        bytes32[] memory siblings = new bytes32[](1);
        siblings[0] = leafB;

        vm.expectRevert(abi.encodeWithSelector(InvalidEligibilityProof.selector, VOTER_B));
        strategy.weightOf(VOTER_B, 0, config, abi.encode(uint256(5), siblings));

        vm.expectRevert(abi.encodeWithSelector(InvalidEligibilityProof.selector, VOTER_A));
        strategy.weightOf(VOTER_A, 0, config, abi.encode(uint256(4), siblings));

        siblings[0] = bytes32(uint256(leafB) ^ 1);
        vm.expectRevert(abi.encodeWithSelector(InvalidEligibilityProof.selector, VOTER_A));
        strategy.weightOf(VOTER_A, 0, config, abi.encode(uint256(5), siblings));
    }

    function testRejectsCrossHostAndCrossChainUse() external {
        bytes32[] memory siblings = new bytes32[](1);
        siblings[0] = leafB;

        bytes memory wrongHost = _config(root, SNAPSHOT_ID, 2, block.chainid, OTHER_HOST);
        vm.expectRevert(abi.encodeWithSelector(InvalidEligibilityProof.selector, VOTER_A));
        strategy.weightOf(VOTER_A, 0, wrongHost, abi.encode(uint256(5), siblings));

        bytes memory wrongChain = _config(root, SNAPSHOT_ID, 2, block.chainid + 1, HOST);
        vm.expectRevert(
            abi.encodeWithSelector(WrongEligibilityChain.selector, block.chainid, block.chainid + 1)
        );
        strategy.validateConfig(wrongChain);
    }

    function testRejectsInvalidMerkleConfiguration() external {
        vm.expectRevert(
            abi.encodeWithSelector(
                InvalidEligibilityConfigLength.selector, uint256(160), uint256(0)
            )
        );
        strategy.validateConfig("");

        vm.expectRevert(InvalidMerkleRoot.selector);
        strategy.validateConfig(_config(bytes32(0), SNAPSHOT_ID, 2, block.chainid, HOST));
        vm.expectRevert(InvalidSnapshotId.selector);
        strategy.validateConfig(_config(root, bytes32(0), 2, block.chainid, HOST));
        vm.expectRevert(InvalidEligibleCount.selector);
        strategy.validateConfig(_config(root, SNAPSHOT_ID, 0, block.chainid, HOST));
        vm.expectRevert(InvalidEligibilityHost.selector);
        strategy.validateConfig(_config(root, SNAPSHOT_ID, 2, block.chainid, address(0)));
    }

    function testRejectsZeroWeightAndMalformedProofEncoding() external {
        bytes memory config = _config(root, SNAPSHOT_ID, 2, block.chainid, HOST);
        bytes32[] memory siblings = new bytes32[](1);
        siblings[0] = leafB;

        vm.expectRevert(abi.encodeWithSelector(ZeroEligibilityWeight.selector, VOTER_A));
        strategy.weightOf(VOTER_A, 0, config, abi.encode(uint256(0), siblings));

        vm.expectRevert(
            abi.encodeWithSelector(InvalidEligibilityProofEncoding.selector, uint256(1))
        );
        strategy.weightOf(VOTER_A, 0, config, hex"01");
    }

    function _config(
        bytes32 root_,
        bytes32 snapshotId,
        uint32 eligibleCount,
        uint256 chainId,
        address host
    ) private pure returns (bytes memory) {
        return abi.encode(root_, snapshotId, eligibleCount, chainId, host);
    }
}
