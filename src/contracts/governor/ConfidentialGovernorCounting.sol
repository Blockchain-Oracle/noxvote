// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { ConfidentialGovernorProposal } from "./ConfidentialGovernorProposal.sol";
import { PlaintextVoteDisabled } from "../types/GovernorGovernanceErrors.sol";
import {
    ConfidentialGovernorConfig,
    ConfidentialProposalState
} from "../types/GovernorGovernanceTypes.sol";
import { DetailedState, Result } from "../types/ConfidentialGovernanceTypes.sol";

abstract contract ConfidentialGovernorCounting is ConfidentialGovernorProposal {
    constructor(ConfidentialGovernorConfig memory config) ConfidentialGovernorProposal(config) { }

    function COUNTING_MODE() public pure virtual override returns (string memory) {
        return "support=confidential-nox&quorum=verdict-only";
    }

    function castVote(uint256, uint8) public pure virtual override returns (uint256) {
        revert PlaintextVoteDisabled();
    }

    function castVoteWithReason(uint256, uint8, string calldata)
        public
        pure
        virtual
        override
        returns (uint256)
    {
        revert PlaintextVoteDisabled();
    }

    function castVoteWithReasonAndParams(uint256, uint8, string calldata, bytes memory)
        public
        pure
        virtual
        override
        returns (uint256)
    {
        revert PlaintextVoteDisabled();
    }

    function castVoteBySig(uint256, uint8, address, bytes memory)
        public
        pure
        virtual
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
    ) public pure virtual override returns (uint256) {
        revert PlaintextVoteDisabled();
    }

    function state(uint256 proposalId) public view virtual override returns (ProposalState) {
        ProposalState currentState = super.state(proposalId);
        if (currentState != ProposalState.Defeated) return currentState;

        DetailedState ballotState = confidentialCore.detailedState(ballotOfProposal[proposalId]);
        if (ballotState == DetailedState.Closed || ballotState == DetailedState.TallyPending) {
            return ProposalState.Pending;
        }
        return currentState;
    }

    function confidentialState(uint256 proposalId)
        external
        view
        returns (ConfidentialProposalState)
    {
        bytes32 ballotId = ballotOfProposal[proposalId];
        if (ballotId == bytes32(0)) return ConfidentialProposalState.Uninitialized;

        ProposalState governorState = state(proposalId);
        if (governorState == ProposalState.Queued) return ConfidentialProposalState.Queued;
        if (governorState == ProposalState.Executed) return ConfidentialProposalState.Executed;
        if (governorState == ProposalState.Canceled) return ConfidentialProposalState.Canceled;

        DetailedState ballotState = confidentialCore.detailedState(ballotId);
        if (ballotState == DetailedState.Scheduled) return ConfidentialProposalState.Scheduled;
        if (ballotState == DetailedState.Open) return ConfidentialProposalState.Open;
        if (ballotState == DetailedState.Closed) return ConfidentialProposalState.Closed;
        if (ballotState == DetailedState.TallyPending) {
            return ConfidentialProposalState.TallyPending;
        }
        if (ballotState == DetailedState.Withheld) return ConfidentialProposalState.Withheld;
        if (ballotState == DetailedState.Rejected) return ConfidentialProposalState.Rejected;
        if (ballotState == DetailedState.Passed) return ConfidentialProposalState.Passed;
        if (ballotState == DetailedState.Canceled) return ConfidentialProposalState.Canceled;
        return ConfidentialProposalState.Uninitialized;
    }

    function _quorumReached(uint256 proposalId) internal view virtual override returns (bool) {
        bytes32 ballotId = ballotOfProposal[proposalId];
        return ballotId != bytes32(0) && confidentialCore.result(ballotId) == Result.Passed;
    }

    function _voteSucceeded(uint256 proposalId) internal view virtual override returns (bool) {
        bytes32 ballotId = ballotOfProposal[proposalId];
        return ballotId != bytes32(0) && confidentialCore.result(ballotId) == Result.Passed;
    }

    function _countVote(uint256, address, uint8, uint256, bytes memory)
        internal
        pure
        virtual
        override
        returns (uint256)
    {
        revert PlaintextVoteDisabled();
    }

    function _castVote(uint256, address, uint8, string memory)
        internal
        pure
        virtual
        override
        returns (uint256)
    {
        revert PlaintextVoteDisabled();
    }

    function _castVote(uint256, address, uint8, string memory, bytes memory)
        internal
        pure
        virtual
        override
        returns (uint256)
    {
        revert PlaintextVoteDisabled();
    }
}
