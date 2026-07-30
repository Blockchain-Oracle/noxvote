// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Test } from "forge-std/Test.sol";
import { ConfidentialGovernanceSpike } from "../../src/spike/ConfidentialGovernanceSpike.sol";
import { externalEuint16 } from "encrypted-types/EncryptedTypes.sol";

contract ConfidentialGovernanceSpikeTest is Test {
    ConfidentialGovernanceSpike private governance;

    address private constant SAFE = address(0xA11CE);
    address private constant TARGET = address(0xBEEF);
    address private constant VOTER_A = address(0x1001);
    address private constant VOTER_B = address(0x1002);
    address private constant OUTSIDER = address(0x9999);

    function setUp() external {
        governance = new ConfidentialGovernanceSpike();
    }

    function testCreatesIndependentProposalSnapshots() external {
        uint64 deadline = uint64(block.timestamp + 1 days);
        uint256 first = _createProposal(deadline, 2);
        uint256 second = _createProposal(deadline + 1, 1);

        assertEq(first, 1);
        assertEq(second, 2);
        assertEq(governance.proposalCount(), 2);
        assertEq(governance.weightOf(first, VOTER_A), 5);
        assertEq(governance.weightOf(first, VOTER_B), 3);
        assertEq(governance.weightOf(second, VOTER_A), 5);

        (ConfidentialGovernanceSpike.ProposalState state,,,,, uint32 floor,,,,) =
            governance.getProposal(second);
        assertEq(uint8(state), uint8(ConfidentialGovernanceSpike.ProposalState.Open));
        assertEq(floor, 1);
    }

    function testRejectsNonCreatorProposalCreation() external {
        (address[] memory voters, uint256[] memory weights) = _snapshot();
        vm.prank(OUTSIDER);
        vm.expectRevert(
            abi.encodeWithSelector(ConfidentialGovernanceSpike.OnlyCreator.selector, OUTSIDER)
        );
        governance.createProposal(
            SAFE, TARGET, 0, hex"1234", uint64(block.timestamp + 1 days), 1, 1, voters, weights
        );
    }

    function testRejectsDuplicateVoters() external {
        address[] memory voters = new address[](2);
        voters[0] = VOTER_A;
        voters[1] = VOTER_A;
        uint256[] memory weights = new uint256[](2);
        weights[0] = 5;
        weights[1] = 3;

        vm.expectRevert(
            abi.encodeWithSelector(ConfidentialGovernanceSpike.DuplicateVoter.selector, VOTER_A)
        );
        governance.createProposal(
            SAFE, TARGET, 0, hex"1234", uint64(block.timestamp + 1 days), 1, 1, voters, weights
        );
    }

    function testRejectsImpossiblePrivacyFloor() external {
        (address[] memory voters, uint256[] memory weights) = _snapshot();
        vm.expectRevert(
            abi.encodeWithSelector(
                ConfidentialGovernanceSpike.InvalidPrivacyFloor.selector, uint32(3), uint256(2)
            )
        );
        governance.createProposal(
            SAFE, TARGET, 0, hex"1234", uint64(block.timestamp + 1 days), 3, 1, voters, weights
        );
    }

    function testRejectsIneligibleBeforeTouchingNox() external {
        uint256 proposalId = _createProposal(uint64(block.timestamp + 1 days), 1);

        vm.prank(OUTSIDER);
        vm.expectRevert(
            abi.encodeWithSelector(
                ConfidentialGovernanceSpike.IneligibleVoter.selector, proposalId, OUTSIDER
            )
        );
        governance.castVote(proposalId, 1, externalEuint16.wrap(bytes32(0)), hex"");
    }

    function testRejectsWrongSequenceBeforeTouchingNox() external {
        uint256 proposalId = _createProposal(uint64(block.timestamp + 1 days), 1);

        vm.prank(VOTER_A);
        vm.expectRevert(
            abi.encodeWithSelector(
                ConfidentialGovernanceSpike.WrongSequence.selector,
                proposalId,
                VOTER_A,
                uint64(1),
                uint64(2)
            )
        );
        governance.castVote(proposalId, 2, externalEuint16.wrap(bytes32(0)), hex"");
    }

    function testCannotCloseBeforeDeadline() external {
        uint64 deadline = uint64(block.timestamp + 1 days);
        uint256 proposalId = _createProposal(deadline, 1);

        vm.expectRevert(
            abi.encodeWithSelector(
                ConfidentialGovernanceSpike.VotingStillOpen.selector, proposalId, deadline
            )
        );
        governance.close(proposalId);
    }

    function testBelowFloorWithholdsWithoutPublicVerdictHandle() external {
        uint64 deadline = uint64(block.timestamp + 1 days);
        uint256 proposalId = _createProposal(deadline, 2);
        vm.warp(deadline + 1);

        governance.close(proposalId);

        (ConfidentialGovernanceSpike.ProposalState state,,,,,, uint32 recorded,,,) =
            governance.getProposal(proposalId);
        (,,, bytes32 expectedVerdict) = governance.getAccumulatorHandles(proposalId);
        assertEq(uint8(state), uint8(ConfidentialGovernanceSpike.ProposalState.Withheld));
        assertEq(recorded, 0);
        assertEq(expectedVerdict, bytes32(0));
        assertFalse(governance.isExpectedVerdictPublic(proposalId));

        vm.expectRevert(
            abi.encodeWithSelector(
                ConfidentialGovernanceSpike.WrongProposalState.selector,
                proposalId,
                ConfidentialGovernanceSpike.ProposalState.TallyRequested,
                ConfidentialGovernanceSpike.ProposalState.Withheld
            )
        );
        governance.finalize(proposalId, hex"");
    }

    function testUnknownProposalNeverAliasesStorage() external {
        vm.expectRevert(
            abi.encodeWithSelector(ConfidentialGovernanceSpike.UnknownProposal.selector, 44)
        );
        governance.weightOf(44, VOTER_A);
    }

    function _createProposal(uint64 deadline, uint32 privacyFloor) private returns (uint256) {
        (address[] memory voters, uint256[] memory weights) = _snapshot();
        return governance.createProposal(
            SAFE, TARGET, 0, hex"1234", deadline, privacyFloor, 8, voters, weights
        );
    }

    function _snapshot() private pure returns (address[] memory voters, uint256[] memory weights) {
        voters = new address[](2);
        voters[0] = VOTER_A;
        voters[1] = VOTER_B;
        weights = new uint256[](2);
        weights[0] = 5;
        weights[1] = 3;
    }
}
