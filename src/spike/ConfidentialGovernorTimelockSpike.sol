// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Governor } from "@openzeppelin/contracts/governance/Governor.sol";
import {
    GovernorTimelockControl
} from "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import { TimelockController } from "@openzeppelin/contracts/governance/TimelockController.sol";
import { ConfidentialGovernanceSpike } from "./ConfidentialGovernanceSpike.sol";

/// @notice Product-shaped compatibility proof for a Nox tally feeding an OZ Governor timelock.
/// @dev This deliberately supports new/custom Governors only. It is not production architecture.
contract ConfidentialGovernorTimelockSpike is GovernorTimelockControl {
    enum ConfidentialProposalState {
        Unset,
        Pending,
        Active,
        TallyPending,
        Withheld,
        Defeated,
        Succeeded,
        Queued,
        Executed,
        Canceled
    }

    error PlaintextVoteDisabled();
    error UseConfidentialProposal();
    error SingleActionOnly();
    error ActionValueTooLarge(uint256 value);

    ConfidentialGovernanceSpike public immutable confidentialTally;
    mapping(uint256 governorProposalId => uint256 tallyProposalId) public tallyProposalOf;

    event ConfidentialProposalLinked(
        uint256 indexed governorProposalId, uint256 indexed tallyProposalId
    );

    constructor(TimelockController timelockAddress)
        Governor("Nox Confidential Governor Spike")
        GovernorTimelockControl(timelockAddress)
    {
        // The Governor becomes the tally creator, so only this proposal path can
        // bind an OZ action to a new confidential tally proposal.
        confidentialTally = new ConfidentialGovernanceSpike();
    }

    function propose(address[] memory, uint256[] memory, bytes[] memory, string memory)
        public
        pure
        override
        returns (uint256)
    {
        revert UseConfidentialProposal();
    }

    /// @notice Creates one normal OZ proposal and its action-bound Nox tally in the same transaction.
    function proposeConfidential(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        uint32 privacyFloor,
        uint256 governanceQuorum,
        address[] memory voters,
        uint256[] memory weights
    ) public returns (uint256 proposalId, uint256 tallyProposalId) {
        if (targets.length != 1 || values.length != 1 || calldatas.length != 1) {
            revert SingleActionOnly();
        }
        if (values[0] > type(uint96).max) revert ActionValueTooLarge(values[0]);

        proposalId = _propose(targets, values, calldatas, description, _msgSender());
        tallyProposalId = confidentialTally.createProposal(
            timelock(),
            targets[0],
            uint96(values[0]),
            calldatas[0],
            uint64(proposalDeadline(proposalId)),
            privacyFloor,
            governanceQuorum,
            voters,
            weights
        );
        tallyProposalOf[proposalId] = tallyProposalId;
        emit ConfidentialProposalLinked(proposalId, tallyProposalId);
    }

    /// @notice Standard Governor compatibility state.
    /// @dev OZ has no async tally enum value, so unresolved ended proposals map to Pending.
    ///      `confidentialState` exposes the truthful detailed state to product clients.
    function state(uint256 proposalId) public view override returns (ProposalState) {
        ProposalState currentState = super.state(proposalId);
        if (currentState == ProposalState.Defeated) {
            (ConfidentialGovernanceSpike.ProposalState tallyState,) = _tallyStatus(proposalId);
            if (
                tallyState == ConfidentialGovernanceSpike.ProposalState.Open
                    || tallyState == ConfidentialGovernanceSpike.ProposalState.TallyRequested
            ) {
                return ProposalState.Pending;
            }
        }
        return currentState;
    }

    function confidentialState(uint256 proposalId)
        external
        view
        returns (ConfidentialProposalState)
    {
        ProposalState governorState = super.state(proposalId);
        (ConfidentialGovernanceSpike.ProposalState tallyState,) = _tallyStatus(proposalId);

        if (governorState == ProposalState.Pending) return ConfidentialProposalState.Pending;
        if (governorState == ProposalState.Active) return ConfidentialProposalState.Active;
        if (governorState == ProposalState.Queued) return ConfidentialProposalState.Queued;
        if (governorState == ProposalState.Executed) return ConfidentialProposalState.Executed;
        if (governorState == ProposalState.Canceled) return ConfidentialProposalState.Canceled;
        if (governorState == ProposalState.Succeeded) return ConfidentialProposalState.Succeeded;
        if (tallyState == ConfidentialGovernanceSpike.ProposalState.Withheld) {
            return ConfidentialProposalState.Withheld;
        }
        if (
            tallyState == ConfidentialGovernanceSpike.ProposalState.Open
                || tallyState == ConfidentialGovernanceSpike.ProposalState.TallyRequested
        ) {
            return ConfidentialProposalState.TallyPending;
        }
        return ConfidentialProposalState.Defeated;
    }

    function castVote(uint256, uint8) public pure override returns (uint256) {
        revert PlaintextVoteDisabled();
    }

    function castVoteWithReason(uint256, uint8, string calldata)
        public
        pure
        override
        returns (uint256)
    {
        revert PlaintextVoteDisabled();
    }

    function castVoteWithReasonAndParams(uint256, uint8, string calldata, bytes memory)
        public
        pure
        override
        returns (uint256)
    {
        revert PlaintextVoteDisabled();
    }

    function castVoteBySig(uint256, uint8, address, bytes memory)
        public
        pure
        override
        returns (uint256)
    {
        revert PlaintextVoteDisabled();
    }

    function castVoteWithReasonAndParamsBySig(
        uint256,
        uint8,
        address,
        string calldata,
        bytes memory,
        bytes memory
    ) public pure override returns (uint256) {
        revert PlaintextVoteDisabled();
    }

    function COUNTING_MODE() public pure override returns (string memory) {
        return "support=confidential-nox&quorum=verdict-only";
    }

    function hasVoted(uint256 proposalId, address voter) public view override returns (bool) {
        uint256 tallyProposalId = tallyProposalOf[proposalId];
        if (tallyProposalId == 0) return false;
        (bool recorded,,,,,) = confidentialTally.getBallot(tallyProposalId, voter);
        return recorded;
    }

    function votingDelay() public pure override returns (uint256) {
        return 0;
    }

    function votingPeriod() public pure override returns (uint256) {
        return 60;
    }

    function quorum(uint256) public pure override returns (uint256) {
        // The proposal-scoped quorum is evaluated inside the linked Nox tally.
        return 0;
    }

    function clock() public view override returns (uint48) {
        return uint48(block.timestamp);
    }

    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=timestamp";
    }

    function _quorumReached(uint256 proposalId) internal view override returns (bool) {
        (ConfidentialGovernanceSpike.ProposalState tallyState, bool passed) =
            _tallyStatus(proposalId);
        return _isFinalized(tallyState) && passed;
    }

    function _voteSucceeded(uint256 proposalId) internal view override returns (bool) {
        (ConfidentialGovernanceSpike.ProposalState tallyState, bool passed) =
            _tallyStatus(proposalId);
        return _isFinalized(tallyState) && passed;
    }

    function _getVotes(address, uint256, bytes memory) internal pure override returns (uint256) {
        return 0;
    }

    function _countVote(uint256, address, uint8, uint256, bytes memory)
        internal
        pure
        override
        returns (uint256)
    {
        revert PlaintextVoteDisabled();
    }

    function _castVote(uint256, address, uint8, string memory)
        internal
        pure
        override
        returns (uint256)
    {
        revert PlaintextVoteDisabled();
    }

    function _castVote(uint256, address, uint8, string memory, bytes memory)
        internal
        pure
        override
        returns (uint256)
    {
        revert PlaintextVoteDisabled();
    }

    function _tallyStatus(uint256 proposalId)
        private
        view
        returns (ConfidentialGovernanceSpike.ProposalState tallyState, bool passed)
    {
        uint256 tallyProposalId = tallyProposalOf[proposalId];
        if (tallyProposalId == 0) return (ConfidentialGovernanceSpike.ProposalState.Unset, false);
        (tallyState,,,,,,,,, passed) = confidentialTally.getProposal(tallyProposalId);
    }

    function _isFinalized(ConfidentialGovernanceSpike.ProposalState tallyState)
        private
        pure
        returns (bool)
    {
        return tallyState == ConfidentialGovernanceSpike.ProposalState.Finalized
            || tallyState == ConfidentialGovernanceSpike.ProposalState.Executed;
    }
}
