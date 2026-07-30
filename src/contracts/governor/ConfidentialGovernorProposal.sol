// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import { ConfidentialCoreHost } from "../core/ConfidentialCoreHost.sol";
import { IConfidentialHost } from "../interfaces/IConfidentialHost.sol";
import { ConfidentialGovernorFramework } from "./ConfidentialGovernorFramework.sol";
import {
    UseConfidentialCancellation,
    UseConfidentialProposal
} from "../types/GovernorGovernanceErrors.sol";
import {
    BallotReceipt,
    DetailedState,
    RegisterBallotParams
} from "../types/ConfidentialGovernanceTypes.sol";
import { ConfidentialGovernorConfig } from "../types/GovernorGovernanceTypes.sol";

abstract contract ConfidentialGovernorProposal is
    ConfidentialGovernorFramework,
    ConfidentialCoreHost,
    IConfidentialHost
{
    uint8 public constant MAX_REPLACEMENTS = 2;

    mapping(uint256 proposalId => bytes32 ballotId) public ballotOfProposal;

    event ConfidentialProposalLinked(uint256 indexed proposalId, bytes32 indexed ballotId);

    constructor(ConfidentialGovernorConfig memory config)
        ConfidentialGovernorFramework(config)
        ConfidentialCoreHost(
            config.ivotesStrategy, config.merkleStrategy, config.minimumPrivacyFloor
        )
    { }

    function propose(address[] memory, uint256[] memory, bytes[] memory, string memory)
        public
        pure
        virtual
        override
        returns (uint256)
    {
        revert UseConfidentialProposal();
    }

    function cancel(address[] memory, uint256[] memory, bytes[] memory, bytes32)
        public
        pure
        virtual
        override
        returns (uint256)
    {
        revert UseConfidentialCancellation();
    }

    function proposeConfidential(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        uint32 privacyFloor
    ) public returns (uint256 proposalId, bytes32 ballotId) {
        address proposer = _msgSender();

        if (!_isValidDescriptionForProposer(proposer, description)) {
            revert GovernorRestrictedProposer(proposer);
        }

        uint256 votesThreshold = proposalThreshold();
        if (votesThreshold > 0) {
            uint256 proposerVotes = getVotes(proposer, clock() - 1);
            if (proposerVotes < votesThreshold) {
                revert GovernorInsufficientProposerVotes(proposer, proposerVotes, votesThreshold);
            }
        }

        proposalId = _propose(targets, values, calldatas, description, proposer);

        uint48 snapshot = SafeCast.toUint48(proposalSnapshot(proposalId));
        RegisterBallotParams memory params = RegisterBallotParams({
            hostProposalId: bytes32(proposalId),
            actionHash: bytes32(proposalId),
            eligibilityStrategy: confidentialCore.firstEligibilityStrategy(),
            eligibilityConfig: abi.encode(address(token())),
            snapshot: snapshot,
            voteStart: snapshot,
            voteEnd: SafeCast.toUint48(proposalDeadline(proposalId)),
            privacyFloor: privacyFloor,
            maxReplacements: MAX_REPLACEMENTS
        });

        ballotId = confidentialCore.registerBallot(params);
        ballotOfProposal[proposalId] = ballotId;

        emit ConfidentialProposalLinked(proposalId, ballotId);
    }

    function cancelConfidential(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) external returns (uint256 proposalId) {
        proposalId = getProposalId(targets, values, calldatas, descriptionHash);

        address caller = _msgSender();
        if (!_validateCancel(proposalId, caller)) {
            revert GovernorUnableToCancel(proposalId, caller);
        }

        bytes32 ballotId = ballotOfProposal[proposalId];
        proposalId = _cancel(targets, values, calldatas, descriptionHash);
        confidentialCore.cancel(ballotId);
    }

    function confidentialClock() external view returns (uint48) {
        return clock();
    }

    function confidentialClockMode() external view returns (string memory) {
        return CLOCK_MODE();
    }

    function governanceQuorum(bytes32, uint48 snapshot) external view returns (uint256) {
        return quorum(snapshot);
    }

    function hasVoted(uint256 proposalId, address voter)
        public
        view
        virtual
        override
        returns (bool)
    {
        bytes32 ballotId = ballotOfProposal[proposalId];
        if (ballotId == bytes32(0)) return false;

        BallotReceipt memory voterReceipt = confidentialCore.receipt(ballotId, voter);
        return voterReceipt.recorded;
    }

    function _validateCancel(uint256 proposalId, address caller)
        internal
        view
        virtual
        override
        returns (bool)
    {
        if (!super._validateCancel(proposalId, caller)) return false;

        bytes32 ballotId = ballotOfProposal[proposalId];
        return ballotId != bytes32(0)
            && confidentialCore.detailedState(ballotId) == DetailedState.Scheduled;
    }
}
