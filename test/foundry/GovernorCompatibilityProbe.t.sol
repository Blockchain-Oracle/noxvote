// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Test } from "forge-std/Test.sol";
import { GovernorCompatibilityProbe } from "../../src/spike/GovernorCompatibilityProbe.sol";

contract GovernorCompatibilityProbeTest is Test {
    GovernorCompatibilityProbe private governor;

    function setUp() external {
        governor = new GovernorCompatibilityProbe();
    }

    function testEveryPublicPlaintextVoteRouteIsDisabled() external {
        bytes4 expected = GovernorCompatibilityProbe.PlaintextVoteDisabled.selector;

        vm.expectRevert(expected);
        governor.castVote(1, 1);

        vm.expectRevert(expected);
        governor.castVoteWithReason(1, 1, "plaintext");

        vm.expectRevert(expected);
        governor.castVoteWithReasonAndParams(1, 1, "plaintext", hex"1234");

        vm.expectRevert(expected);
        governor.castVoteBySig(1, 1, address(this), hex"1234");

        vm.expectRevert(expected);
        governor.castVoteWithReasonAndParamsBySig(
            1, 1, address(this), "plaintext", hex"1234", hex"5678"
        );
    }

    function testCountingModeNamesTheConfidentialSeam() external view {
        assertEq(governor.COUNTING_MODE(), "support=confidential-nox&quorum=verdict-only");
    }
}
