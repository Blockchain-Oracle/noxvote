// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Test } from "forge-std/Test.sol";
import { Votes } from "@openzeppelin/contracts/governance/utils/Votes.sol";
import {
    EmptyEligibilityProofRequired,
    InvalidEligibilityConfigLength,
    InvalidEligibilityToken,
    ZeroEligibilityWeight
} from "../../../src/contracts/types/EligibilityErrors.sol";
import {
    IVotesSnapshotStrategy
} from "../../../src/contracts/eligibility/IVotesSnapshotStrategy.sol";
import { VotesTokenFixture } from "./fixtures/EligibilityFixtures.sol";

contract IVotesSnapshotStrategyTest is Test {
    address private constant VOTER = address(0xA11CE);
    address private constant OUTSIDER = address(0xB0B);

    IVotesSnapshotStrategy private strategy;
    VotesTokenFixture private token;

    function setUp() external {
        vm.roll(10);
        strategy = new IVotesSnapshotStrategy();
        token = new VotesTokenFixture();
        token.mint(VOTER, 7);
        vm.prank(VOTER);
        token.delegate(VOTER);
        vm.roll(11);
    }

    function testValidatesTokenAndReturnsPastDelegatedWeight() external {
        bytes memory config = abi.encode(address(token));

        assertEq(strategy.validateConfig(config), 0);
        assertEq(strategy.weightOf(VOTER, 10, config, ""), 7);

        token.mint(VOTER, 5);
        vm.roll(12);
        assertEq(strategy.weightOf(VOTER, 10, config, ""), 7);
        assertEq(strategy.weightOf(VOTER, 11, config, ""), 12);
    }

    function testRejectsZeroWeight() external {
        vm.expectRevert(abi.encodeWithSelector(ZeroEligibilityWeight.selector, OUTSIDER));
        strategy.weightOf(OUTSIDER, 10, abi.encode(address(token)), "");
    }

    function testRejectsFutureSnapshotThroughOpenZeppelinVotes() external {
        vm.expectRevert(
            abi.encodeWithSelector(Votes.ERC5805FutureLookup.selector, uint256(11), uint48(11))
        );
        strategy.weightOf(VOTER, 11, abi.encode(address(token)), "");
    }

    function testRejectsInvalidTokenConfiguration() external {
        vm.expectRevert(
            abi.encodeWithSelector(InvalidEligibilityConfigLength.selector, uint256(32), uint256(0))
        );
        strategy.validateConfig("");

        vm.expectRevert(abi.encodeWithSelector(InvalidEligibilityToken.selector, address(0)));
        strategy.validateConfig(abi.encode(address(0)));

        vm.expectRevert(abi.encodeWithSelector(InvalidEligibilityToken.selector, OUTSIDER));
        strategy.validateConfig(abi.encode(OUTSIDER));
    }

    function testRejectsUnexpectedEligibilityProof() external {
        vm.expectRevert(abi.encodeWithSelector(EmptyEligibilityProofRequired.selector, uint256(1)));
        strategy.weightOf(VOTER, 10, abi.encode(address(token)), hex"01");
    }
}
