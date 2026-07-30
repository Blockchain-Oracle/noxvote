// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Nox } from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import { ebool, euint16, euint256, externalEuint16 } from "encrypted-types/EncryptedTypes.sol";
import {
    IModuleManager
} from "@safe-global/safe-smart-account/contracts/interfaces/IModuleManager.sol";
import { Enum } from "@safe-global/safe-smart-account/contracts/libraries/Enum.sol";

/// @notice Bounded feasibility contract for the released Nox confidential-voting path.
/// @dev This is spike evidence, not an approved production architecture.
contract ConfidentialGovernanceSpike {
    enum ProposalState {
        Unset,
        Open,
        Withheld,
        TallyRequested,
        Finalized,
        Executed
    }

    struct Proposal {
        ProposalState state;
        address safe;
        address target;
        uint96 value;
        uint64 deadline;
        uint32 privacyFloor;
        uint32 recordedVoters;
        uint256 governanceQuorum;
        bytes32 actionCalldataHash;
        euint256 againstTotal;
        euint256 forTotal;
        euint256 abstainTotal;
        ebool expectedVerdict;
        bool passed;
    }

    struct Ballot {
        bool recorded;
        uint64 sequence;
        euint16 choice;
        euint256 againstContribution;
        euint256 forContribution;
        euint256 abstainContribution;
    }

    struct OperationTrace {
        bytes32 choice;
        bytes32 isAgainst;
        bytes32 isFor;
        bytes32 againstContribution;
        bytes32 forContribution;
        bytes32 abstainContribution;
        bytes32 againstAccumulator;
        bytes32 forAccumulator;
        bytes32 abstainAccumulator;
    }

    struct VoteComputation {
        euint16 choice;
        ebool isAgainst;
        ebool isFor;
        euint256 againstContribution;
        euint256 forContribution;
        euint256 abstainContribution;
    }

    struct Accumulators {
        euint256 againstTotal;
        euint256 forTotal;
        euint256 abstainTotal;
    }

    struct TallyTrace {
        bytes32 totalParticipation;
        bytes32 quorumReached;
        bytes32 forWins;
        bytes32 quorumWord;
        bytes32 winsWord;
        bytes32 conjunction;
        bytes32 verdict;
    }

    error OnlyCreator(address caller);
    error InvalidAddress();
    error InvalidDeadline(uint64 deadline);
    error InvalidPrivacyFloor(uint32 privacyFloor, uint256 eligibleVoters);
    error InvalidGovernanceQuorum();
    error InvalidVoterSnapshot();
    error DuplicateVoter(address voter);
    error UnknownProposal(uint256 proposalId);
    error WrongProposalState(uint256 proposalId, ProposalState expected, ProposalState actual);
    error VotingStillOpen(uint256 proposalId, uint64 deadline);
    error VotingClosed(uint256 proposalId, uint64 deadline);
    error IneligibleVoter(uint256 proposalId, address voter);
    error WrongSequence(uint256 proposalId, address voter, uint64 expected, uint64 supplied);
    error VerdictNotReady(uint256 proposalId);
    error ProposalDidNotPass(uint256 proposalId);
    error ActionMismatch(uint256 proposalId);
    error SafeExecutionFailed(uint256 proposalId);

    address public immutable creator;
    uint256 public proposalCount;

    mapping(uint256 proposalId => Proposal) private _proposals;
    mapping(uint256 proposalId => mapping(address voter => uint256 weight)) private _weights;
    mapping(uint256 proposalId => mapping(address voter => Ballot)) private _ballots;
    mapping(
        uint256 proposalId => mapping(address voter => mapping(uint64 sequence => OperationTrace))
    ) private _operationTraces;
    mapping(uint256 proposalId => TallyTrace) private _tallyTraces;

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed safe,
        address indexed target,
        uint96 value,
        bytes32 actionCalldataHash,
        uint64 deadline,
        uint32 privacyFloor,
        uint256 governanceQuorum
    );
    event VoteRecorded(
        uint256 indexed proposalId,
        address indexed voter,
        uint64 indexed sequence,
        bool replacement,
        uint32 recordedVoters
    );
    event ProposalWithheld(uint256 indexed proposalId, uint32 recordedVoters, uint32 privacyFloor);
    event TallyRequested(uint256 indexed proposalId, bytes32 indexed expectedVerdictHandle);
    event ProposalFinalized(uint256 indexed proposalId, bool passed);
    event ProposalExecuted(
        uint256 indexed proposalId, address indexed safe, address indexed target
    );

    constructor() {
        creator = msg.sender;
    }

    /// @notice Creates a proposal and freezes its public eligibility/weight snapshot.
    function createProposal(
        address safe,
        address target,
        uint96 value,
        bytes calldata actionCalldata,
        uint64 deadline,
        uint32 privacyFloor,
        uint256 governanceQuorum,
        address[] calldata voters,
        uint256[] calldata weights
    ) external returns (uint256 proposalId) {
        if (msg.sender != creator) revert OnlyCreator(msg.sender);
        if (safe == address(0) || target == address(0)) revert InvalidAddress();
        if (deadline <= block.timestamp) revert InvalidDeadline(deadline);
        if (voters.length == 0 || voters.length != weights.length) revert InvalidVoterSnapshot();
        if (privacyFloor == 0 || privacyFloor > voters.length) {
            revert InvalidPrivacyFloor(privacyFloor, voters.length);
        }
        if (governanceQuorum == 0) revert InvalidGovernanceQuorum();

        proposalId = ++proposalCount;
        Proposal storage proposal = _proposals[proposalId];
        proposal.state = ProposalState.Open;
        proposal.safe = safe;
        proposal.target = target;
        proposal.value = value;
        proposal.deadline = deadline;
        proposal.privacyFloor = privacyFloor;
        proposal.governanceQuorum = governanceQuorum;
        proposal.actionCalldataHash = keccak256(actionCalldata);

        for (uint256 i = 0; i < voters.length; ++i) {
            address voter = voters[i];
            uint256 weight = weights[i];
            if (voter == address(0) || weight == 0) revert InvalidVoterSnapshot();
            if (_weights[proposalId][voter] != 0) revert DuplicateVoter(voter);
            _weights[proposalId][voter] = weight;
        }

        emit ProposalCreated(
            proposalId,
            safe,
            target,
            value,
            proposal.actionCalldataHash,
            deadline,
            privacyFloor,
            governanceQuorum
        );
    }

    /// @notice Records or replaces a proposal-scoped confidential ballot.
    /// @dev Choice encoding is 0=Against, 1=For, 2=Abstain; every other uint16 normalizes to Abstain.
    function castVote(
        uint256 proposalId,
        uint64 sequence,
        externalEuint16 externalChoice,
        bytes calldata handleProof
    ) external {
        Proposal storage proposal = _proposal(proposalId);
        if (proposal.state != ProposalState.Open) {
            revert WrongProposalState(proposalId, ProposalState.Open, proposal.state);
        }
        if (block.timestamp > proposal.deadline) {
            revert VotingClosed(proposalId, proposal.deadline);
        }

        uint256 weight = _weights[proposalId][msg.sender];
        if (weight == 0) revert IneligibleVoter(proposalId, msg.sender);

        Ballot storage ballot = _ballots[proposalId][msg.sender];
        uint64 expectedSequence = ballot.sequence + 1;
        if (sequence != expectedSequence) {
            revert WrongSequence(proposalId, msg.sender, expectedSequence, sequence);
        }

        bool replacement = ballot.recorded;
        VoteComputation memory vote = _computeVote(externalChoice, handleProof, weight);
        Accumulators memory accumulators = _updateAccumulators(proposal, ballot, vote);

        if (!replacement) {
            proposal.recordedVoters += 1;
        }

        _persistVoteHandles(vote, accumulators);

        ballot.recorded = true;
        ballot.sequence = sequence;
        ballot.choice = vote.choice;
        ballot.againstContribution = vote.againstContribution;
        ballot.forContribution = vote.forContribution;
        ballot.abstainContribution = vote.abstainContribution;
        proposal.againstTotal = accumulators.againstTotal;
        proposal.forTotal = accumulators.forTotal;
        proposal.abstainTotal = accumulators.abstainTotal;

        _operationTraces[proposalId][msg.sender][sequence] = OperationTrace({
            choice: euint16.unwrap(vote.choice),
            isAgainst: ebool.unwrap(vote.isAgainst),
            isFor: ebool.unwrap(vote.isFor),
            againstContribution: euint256.unwrap(vote.againstContribution),
            forContribution: euint256.unwrap(vote.forContribution),
            abstainContribution: euint256.unwrap(vote.abstainContribution),
            againstAccumulator: euint256.unwrap(accumulators.againstTotal),
            forAccumulator: euint256.unwrap(accumulators.forTotal),
            abstainAccumulator: euint256.unwrap(accumulators.abstainTotal)
        });

        emit VoteRecorded(proposalId, msg.sender, sequence, replacement, proposal.recordedVoters);
    }

    /// @notice Closes voting; below-floor proposals expose no verdict handle.
    function close(uint256 proposalId) external {
        Proposal storage proposal = _proposal(proposalId);
        if (proposal.state != ProposalState.Open) {
            revert WrongProposalState(proposalId, ProposalState.Open, proposal.state);
        }
        if (block.timestamp <= proposal.deadline) {
            revert VotingStillOpen(proposalId, proposal.deadline);
        }

        if (proposal.recordedVoters < proposal.privacyFloor) {
            proposal.state = ProposalState.Withheld;
            emit ProposalWithheld(proposalId, proposal.recordedVoters, proposal.privacyFloor);
            return;
        }

        euint256 totalParticipation =
            Nox.add(Nox.add(proposal.againstTotal, proposal.forTotal), proposal.abstainTotal);
        euint256 quorum = Nox.toEuint256(proposal.governanceQuorum);
        ebool quorumReached = Nox.ge(totalParticipation, quorum);
        ebool forWins = Nox.gt(proposal.forTotal, proposal.againstTotal);
        euint256 one = Nox.toEuint256(1);
        euint256 zero = Nox.toEuint256(0);
        euint256 quorumWord = Nox.select(quorumReached, one, zero);
        euint256 winsWord = Nox.select(forWins, one, zero);
        euint256 conjunction = Nox.mul(quorumWord, winsWord);
        ebool verdict = Nox.eq(conjunction, one);

        _persistTallyHandles(
            totalParticipation, quorumReached, forWins, quorumWord, winsWord, conjunction, verdict
        );
        Nox.allowPublicDecryption(verdict);

        proposal.expectedVerdict = verdict;
        proposal.state = ProposalState.TallyRequested;
        _tallyTraces[proposalId] = TallyTrace({
            totalParticipation: euint256.unwrap(totalParticipation),
            quorumReached: ebool.unwrap(quorumReached),
            forWins: ebool.unwrap(forWins),
            quorumWord: euint256.unwrap(quorumWord),
            winsWord: euint256.unwrap(winsWord),
            conjunction: euint256.unwrap(conjunction),
            verdict: ebool.unwrap(verdict)
        });

        emit TallyRequested(proposalId, ebool.unwrap(verdict));
    }

    /// @notice Finalizes exactly the proposal whose stored verdict handle matches the Gateway proof.
    function finalize(uint256 proposalId, bytes calldata decryptionProof) external {
        Proposal storage proposal = _proposal(proposalId);
        if (proposal.state != ProposalState.TallyRequested) {
            revert WrongProposalState(proposalId, ProposalState.TallyRequested, proposal.state);
        }
        if (!Nox.isInitialized(proposal.expectedVerdict)) revert VerdictNotReady(proposalId);

        proposal.passed = Nox.publicDecrypt(proposal.expectedVerdict, decryptionProof);
        proposal.state = ProposalState.Finalized;
        emit ProposalFinalized(proposalId, proposal.passed);
    }

    /// @notice Executes the proposal's exact committed call once through its enabled Safe module.
    function execute(
        uint256 proposalId,
        address target,
        uint96 value,
        bytes calldata actionCalldata
    ) external {
        Proposal storage proposal = _proposal(proposalId);
        if (proposal.state != ProposalState.Finalized) {
            revert WrongProposalState(proposalId, ProposalState.Finalized, proposal.state);
        }
        if (!proposal.passed) revert ProposalDidNotPass(proposalId);
        if (
            target != proposal.target || value != proposal.value
                || keccak256(actionCalldata) != proposal.actionCalldataHash
        ) revert ActionMismatch(proposalId);

        proposal.state = ProposalState.Executed;
        bool success = IModuleManager(proposal.safe)
            .execTransactionFromModule(target, value, actionCalldata, Enum.Operation.Call);
        if (!success) revert SafeExecutionFailed(proposalId);

        emit ProposalExecuted(proposalId, proposal.safe, target);
    }

    function getProposal(uint256 proposalId)
        external
        view
        returns (
            ProposalState state,
            address safe,
            address target,
            uint96 value,
            uint64 deadline,
            uint32 privacyFloor,
            uint32 recordedVoters,
            uint256 governanceQuorum,
            bytes32 actionCalldataHash,
            bool passed
        )
    {
        Proposal storage proposal = _proposal(proposalId);
        return (
            proposal.state,
            proposal.safe,
            proposal.target,
            proposal.value,
            proposal.deadline,
            proposal.privacyFloor,
            proposal.recordedVoters,
            proposal.governanceQuorum,
            proposal.actionCalldataHash,
            proposal.passed
        );
    }

    function getAccumulatorHandles(uint256 proposalId)
        external
        view
        returns (
            bytes32 againstTotal,
            bytes32 forTotal,
            bytes32 abstainTotal,
            bytes32 expectedVerdict
        )
    {
        Proposal storage proposal = _proposal(proposalId);
        return (
            euint256.unwrap(proposal.againstTotal),
            euint256.unwrap(proposal.forTotal),
            euint256.unwrap(proposal.abstainTotal),
            ebool.unwrap(proposal.expectedVerdict)
        );
    }

    function weightOf(uint256 proposalId, address voter) external view returns (uint256) {
        _proposal(proposalId);
        return _weights[proposalId][voter];
    }

    function getBallot(uint256 proposalId, address voter)
        external
        view
        returns (
            bool recorded,
            uint64 sequence,
            bytes32 choice,
            bytes32 againstContribution,
            bytes32 forContribution,
            bytes32 abstainContribution
        )
    {
        _proposal(proposalId);
        Ballot storage ballot = _ballots[proposalId][voter];
        return (
            ballot.recorded,
            ballot.sequence,
            euint16.unwrap(ballot.choice),
            euint256.unwrap(ballot.againstContribution),
            euint256.unwrap(ballot.forContribution),
            euint256.unwrap(ballot.abstainContribution)
        );
    }

    function getOperationTrace(uint256 proposalId, address voter, uint64 sequence)
        external
        view
        returns (OperationTrace memory)
    {
        _proposal(proposalId);
        return _operationTraces[proposalId][voter][sequence];
    }

    function getTallyTrace(uint256 proposalId) external view returns (TallyTrace memory) {
        _proposal(proposalId);
        return _tallyTraces[proposalId];
    }

    function isExpectedVerdictPublic(uint256 proposalId) external view returns (bool) {
        Proposal storage proposal = _proposal(proposalId);
        if (!Nox.isInitialized(proposal.expectedVerdict)) return false;
        return Nox.isPubliclyDecryptable(proposal.expectedVerdict);
    }

    function _proposal(uint256 proposalId) private view returns (Proposal storage proposal) {
        proposal = _proposals[proposalId];
        if (proposal.state == ProposalState.Unset) revert UnknownProposal(proposalId);
    }

    function _computeVote(
        externalEuint16 externalChoice,
        bytes calldata handleProof,
        uint256 weight
    ) private returns (VoteComputation memory vote) {
        vote.choice = Nox.fromExternal(externalChoice, handleProof);
        vote.isAgainst = Nox.eq(vote.choice, Nox.toEuint16(0));
        vote.isFor = Nox.eq(vote.choice, Nox.toEuint16(1));

        euint256 encryptedWeight = Nox.toEuint256(weight);
        euint256 zero = Nox.toEuint256(0);
        vote.againstContribution = Nox.select(vote.isAgainst, encryptedWeight, zero);
        vote.forContribution = Nox.select(vote.isFor, encryptedWeight, zero);
        vote.abstainContribution =
            Nox.sub(Nox.sub(encryptedWeight, vote.againstContribution), vote.forContribution);
    }

    function _updateAccumulators(
        Proposal storage proposal,
        Ballot storage ballot,
        VoteComputation memory vote
    ) private returns (Accumulators memory accumulators) {
        if (ballot.recorded) {
            accumulators.againstTotal = Nox.add(
                Nox.sub(proposal.againstTotal, ballot.againstContribution), vote.againstContribution
            );
            accumulators.forTotal =
                Nox.add(Nox.sub(proposal.forTotal, ballot.forContribution), vote.forContribution);
            accumulators.abstainTotal = Nox.add(
                Nox.sub(proposal.abstainTotal, ballot.abstainContribution), vote.abstainContribution
            );
        } else {
            accumulators.againstTotal = Nox.add(proposal.againstTotal, vote.againstContribution);
            accumulators.forTotal = Nox.add(proposal.forTotal, vote.forContribution);
            accumulators.abstainTotal = Nox.add(proposal.abstainTotal, vote.abstainContribution);
        }
    }

    function _persistVoteHandles(VoteComputation memory vote, Accumulators memory accumulators)
        private
    {
        Nox.allowThis(vote.choice);
        Nox.allowThis(vote.isAgainst);
        Nox.allowThis(vote.isFor);
        Nox.allowThis(vote.againstContribution);
        Nox.allowThis(vote.forContribution);
        Nox.allowThis(vote.abstainContribution);
        Nox.allowThis(accumulators.againstTotal);
        Nox.allowThis(accumulators.forTotal);
        Nox.allowThis(accumulators.abstainTotal);
    }

    function _persistTallyHandles(
        euint256 totalParticipation,
        ebool quorumReached,
        ebool forWins,
        euint256 quorumWord,
        euint256 winsWord,
        euint256 conjunction,
        ebool verdict
    ) private {
        Nox.allowThis(totalParticipation);
        Nox.allowThis(quorumReached);
        Nox.allowThis(forWins);
        Nox.allowThis(quorumWord);
        Nox.allowThis(winsWord);
        Nox.allowThis(conjunction);
        Nox.allowThis(verdict);
    }
}
