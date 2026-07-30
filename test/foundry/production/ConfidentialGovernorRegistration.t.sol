// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Test } from "forge-std/Test.sol";
import { IGovernor } from "@openzeppelin/contracts/governance/IGovernor.sol";
import { TimelockController } from "@openzeppelin/contracts/governance/TimelockController.sol";
import { IVotes } from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import { ConfidentialGovernor } from "../../../src/contracts/governor/ConfidentialGovernor.sol";
import {
    IVotesSnapshotStrategy
} from "../../../src/contracts/eligibility/IVotesSnapshotStrategy.sol";
import {
    MerkleWeightedAllowlistStrategy
} from "../../../src/contracts/eligibility/MerkleWeightedAllowlistStrategy.sol";
import { InvalidPrivacyFloor } from "../../../src/contracts/types/ConfidentialGovernanceErrors.sol";
import {
    PlaintextVoteDisabled,
    UseConfidentialProposal
} from "../../../src/contracts/types/GovernorGovernanceErrors.sol";
import {
    ConfidentialGovernorConfig
} from "../../../src/contracts/types/GovernorGovernanceTypes.sol";
import {
    BallotRecord,
    DetailedState
} from "../../../src/contracts/types/ConfidentialGovernanceTypes.sol";
import { VotesTokenFixture } from "./fixtures/EligibilityFixtures.sol";

contract ConfidentialGovernorHarness is ConfidentialGovernor {
    constructor(ConfidentialGovernorConfig memory config) ConfidentialGovernor(config) { }

    function exposedCountVote() external view returns (uint256) {
        return _countVote(1, msg.sender, 1, 1, "");
    }

    function exposedCastVote() external view returns (uint256) {
        return _castVote(1, msg.sender, 1, "plaintext");
    }

    function exposedCastVoteWithParams() external view returns (uint256) {
        return _castVote(1, msg.sender, 1, "plaintext", hex"1234");
    }
}

contract ConfidentialGovernorRegistrationTest is Test {
    address private constant PROPOSER = address(0xA11CE);
    address private constant OUTSIDER = address(0xB0B);
    uint32 private constant PRIVACY_FLOOR = 4;
    uint48 private constant VOTING_DELAY = 2;
    uint32 private constant VOTING_PERIOD = 10;
    uint256 private constant PROPOSAL_THRESHOLD = 10;
    uint256 private constant QUORUM_NUMERATOR = 20;

    VotesTokenFixture private token;
    IVotesSnapshotStrategy private ivotesStrategy;
    MerkleWeightedAllowlistStrategy private merkleStrategy;
    TimelockController private timelock;
    ConfidentialGovernorHarness private governor;

    function setUp() external {
        vm.roll(10);
        token = new VotesTokenFixture();
        token.mint(PROPOSER, 20);
        vm.prank(PROPOSER);
        token.delegate(PROPOSER);
        vm.roll(11);

        ivotesStrategy = new IVotesSnapshotStrategy();
        merkleStrategy = new MerkleWeightedAllowlistStrategy();

        address[] memory noAccounts = new address[](0);
        timelock = new TimelockController(1 days, noAccounts, noAccounts, address(this));
        ConfidentialGovernorConfig memory config = ConfidentialGovernorConfig({
            name: "Nox Confidential Governor",
            token: IVotes(address(token)),
            timelock: timelock,
            initialVotingDelay: VOTING_DELAY,
            initialVotingPeriod: VOTING_PERIOD,
            initialProposalThreshold: PROPOSAL_THRESHOLD,
            initialQuorumNumerator: QUORUM_NUMERATOR,
            ivotesStrategy: address(ivotesStrategy),
            merkleStrategy: address(merkleStrategy),
            minimumPrivacyFloor: PRIVACY_FLOOR
        });
        governor = new ConfidentialGovernorHarness(config);
    }

    function testConstructsImmutableGovernorAndHostBoundCore() external view {
        assertEq(governor.name(), "Nox Confidential Governor");
        assertEq(address(governor.token()), address(token));
        assertEq(governor.timelock(), address(timelock));
        assertEq(governor.votingDelay(), VOTING_DELAY);
        assertEq(governor.votingPeriod(), VOTING_PERIOD);
        assertEq(governor.proposalThreshold(), PROPOSAL_THRESHOLD);
        assertEq(governor.quorumNumerator(), QUORUM_NUMERATOR);
        assertEq(governor.COUNTING_MODE(), "support=confidential-nox&quorum=verdict-only");
        assertEq(governor.confidentialClock(), token.clock());
        assertEq(governor.confidentialClockMode(), token.CLOCK_MODE());

        assertEq(governor.confidentialCore().host(), address(governor));
        assertEq(governor.confidentialCore().firstEligibilityStrategy(), address(ivotesStrategy));
        assertEq(governor.confidentialCore().secondEligibilityStrategy(), address(merkleStrategy));
        assertEq(governor.confidentialCore().organizationMinimumPrivacyFloor(), PRIVACY_FLOOR);
    }

    function testConfidentialProposalBindsExactMultiActionHashAndCoreBallot() external {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) =
            _multiAction();
        string memory description = "Upgrade treasury policy";
        bytes32 descriptionHash = keccak256(bytes(description));
        uint256 expectedProposalId =
            governor.hashProposal(targets, values, calldatas, descriptionHash);

        vm.prank(PROPOSER);
        (uint256 proposalId, bytes32 ballotId) =
            governor.proposeConfidential(targets, values, calldatas, description, PRIVACY_FLOOR);

        assertEq(proposalId, expectedProposalId);
        assertEq(governor.ballotOfProposal(proposalId), ballotId);
        assertEq(governor.proposalProposer(proposalId), PROPOSER);

        BallotRecord memory ballot = governor.confidentialCore().ballot(ballotId);
        assertEq(ballot.hostProposalId, bytes32(proposalId));
        assertEq(ballot.actionHash, bytes32(proposalId));
        assertEq(ballot.eligibilityStrategy, address(ivotesStrategy));
        assertEq(ballot.snapshot, governor.proposalSnapshot(proposalId));
        assertEq(ballot.voteStart, governor.proposalSnapshot(proposalId));
        assertEq(ballot.voteEnd, governor.proposalDeadline(proposalId));
        assertEq(ballot.privacyFloor, PRIVACY_FLOOR);
        assertEq(ballot.maxReplacements, 2);
        assertEq(
            abi.decode(governor.confidentialCore().eligibilityConfig(ballotId), (address)),
            address(token)
        );
        assertEq(
            uint8(governor.confidentialCore().detailedState(ballotId)),
            uint8(DetailedState.Scheduled)
        );
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Pending));
    }

    function testReproducesDescriptionRestrictionBeforeProposalCreation() external {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) =
            _singleAction();
        string memory description =
            "Restricted proposal #proposer=0x0000000000000000000000000000000000000b0b";

        vm.expectRevert(
            abi.encodeWithSelector(IGovernor.GovernorRestrictedProposer.selector, PROPOSER)
        );
        vm.prank(PROPOSER);
        governor.proposeConfidential(targets, values, calldatas, description, PRIVACY_FLOOR);
    }

    function testReproducesProposalThresholdBeforeProposalCreation() external {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) =
            _singleAction();

        vm.expectRevert(
            abi.encodeWithSelector(
                IGovernor.GovernorInsufficientProposerVotes.selector,
                OUTSIDER,
                0,
                PROPOSAL_THRESHOLD
            )
        );
        vm.prank(OUTSIDER);
        governor.proposeConfidential(
            targets, values, calldatas, "Insufficient votes", PRIVACY_FLOOR
        );
    }

    function testCoreRegistrationFailureRollsBackGovernorProposal() external {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) =
            _singleAction();
        string memory description = "Floor below organization minimum";
        uint256 proposalId =
            governor.hashProposal(targets, values, calldatas, keccak256(bytes(description)));

        vm.expectRevert(
            abi.encodeWithSelector(InvalidPrivacyFloor.selector, uint32(3), PRIVACY_FLOOR)
        );
        vm.prank(PROPOSER);
        governor.proposeConfidential(targets, values, calldatas, description, 3);

        assertEq(governor.proposalSnapshot(proposalId), 0);
        assertEq(governor.ballotOfProposal(proposalId), bytes32(0));
    }

    function testStandardProposalRouteIsDisabled() external {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) =
            _singleAction();

        vm.expectRevert(UseConfidentialProposal.selector);
        vm.prank(PROPOSER);
        governor.propose(targets, values, calldatas, "No unbound proposal");
    }

    function testEveryPublicPlaintextVoteRouteRejectsWithoutConsumingNonce() external {
        uint256 nonceBefore = governor.nonces(PROPOSER);

        vm.expectRevert(PlaintextVoteDisabled.selector);
        governor.castVote(1, 1);

        vm.expectRevert(PlaintextVoteDisabled.selector);
        governor.castVoteWithReason(1, 1, "plaintext");

        vm.expectRevert(PlaintextVoteDisabled.selector);
        governor.castVoteWithReasonAndParams(1, 1, "plaintext", hex"1234");

        vm.expectRevert(PlaintextVoteDisabled.selector);
        governor.castVoteBySig(1, 1, PROPOSER, hex"1234");

        vm.expectRevert(PlaintextVoteDisabled.selector);
        governor.castVoteWithReasonAndParamsBySig(1, 1, PROPOSER, "plaintext", hex"1234", hex"5678");

        assertEq(governor.nonces(PROPOSER), nonceBefore);
    }

    function testEveryInternalPlaintextVoteRouteIsDisabled() external {
        vm.expectRevert(PlaintextVoteDisabled.selector);
        governor.exposedCountVote();

        vm.expectRevert(PlaintextVoteDisabled.selector);
        governor.exposedCastVote();

        vm.expectRevert(PlaintextVoteDisabled.selector);
        governor.exposedCastVoteWithParams();
    }

    function _singleAction()
        private
        pure
        returns (address[] memory targets, uint256[] memory values, bytes[] memory calldatas)
    {
        targets = new address[](1);
        values = new uint256[](1);
        calldatas = new bytes[](1);
        targets[0] = address(0xCAFE);
        values[0] = 1 ether;
        calldatas[0] = abi.encodeWithSignature("setValue(uint256)", 7);
    }

    function _multiAction()
        private
        pure
        returns (address[] memory targets, uint256[] memory values, bytes[] memory calldatas)
    {
        targets = new address[](2);
        values = new uint256[](2);
        calldatas = new bytes[](2);
        targets[0] = address(0xCAFE);
        targets[1] = address(0xBEEF);
        values[0] = 1 ether;
        values[1] = 2 ether;
        calldatas[0] = abi.encodeWithSignature("setValue(uint256)", 7);
        calldatas[1] = abi.encodeWithSignature("setOwner(address)", address(0xD00D));
    }
}
