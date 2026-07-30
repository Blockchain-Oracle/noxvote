// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { ConfidentialBallotCore } from "../../../src/contracts/core/ConfidentialBallotCore.sol";
import {
    IVotesSnapshotStrategy
} from "../../../src/contracts/eligibility/IVotesSnapshotStrategy.sol";
import {
    MerkleWeightedAllowlistStrategy
} from "../../../src/contracts/eligibility/MerkleWeightedAllowlistStrategy.sol";
import {
    BallotReceipt,
    BallotRecord,
    DetailedState,
    RegisterBallotParams,
    Result
} from "../../../src/contracts/types/ConfidentialGovernanceTypes.sol";
import {
    SafeAction,
    SafeBallotConfig,
    SafeProposalRecord
} from "../../../src/contracts/types/SafeGovernanceTypes.sol";
import {
    ConfidentialGovernanceInvariantHandler,
    CoreInvariantConfig,
    InvariantSafeExecutionTarget,
    SafeInvariantConfig
} from "./fixtures/ConfidentialGovernanceInvariantHandler.sol";
import { HostClockFixture } from "./fixtures/CoreFixtures.sol";
import { VotesTokenFixture } from "./fixtures/EligibilityFixtures.sol";
import { SafeExecutionFixture } from "./fixtures/SafeExecutionFixtures.sol";

contract ConfidentialGovernanceInvariantTest is SafeExecutionFixture {
    uint48 private constant SNAPSHOT = 10;
    uint48 private constant VOTE_START = 100;
    uint48 private constant VOTE_END = 200;

    ConfidentialGovernanceInvariantHandler private handler;
    ConfidentialBallotCore private votingCore;
    ConfidentialBallotCore private belowFloorCore;
    ConfidentialBallotCore private finalizationCore;
    InvariantSafeExecutionTarget private executionTarget;
    bytes32 private votingBallotId;
    bytes32 private belowFloorBallotId;
    bytes32 private finalizationBallotId;
    bytes32 private safeProposalId;

    function setUp() public override {
        super.setUp();

        (CoreInvariantConfig memory coreConfig, address[4] memory voters) = _deployCoreDomains();
        SafeInvariantConfig memory safeConfig = _deployPassedSafeProposal();
        handler = new ConfidentialGovernanceInvariantHandler(coreConfig, safeConfig);
        handler.seedDisclosureDomains();

        bytes4[] memory selectors = new bytes4[](7);
        selectors[0] = handler.castNext.selector;
        selectors[1] = handler.mutateVotingPower.selector;
        selectors[2] = handler.attemptWrongSequence.selector;
        selectors[3] = handler.requestBelowFloor.selector;
        selectors[4] = handler.finalize.selector;
        selectors[5] = handler.setSafeFailure.selector;
        selectors[6] = handler.executeSafe.selector;
        targetContract(address(handler));
        targetSelector(FuzzSelector({ addr: address(handler), selectors: selectors }));

        for (uint256 i = 0; i < voters.length; ++i) {
            assertEq(handler.voters(i), voters[i]);
        }
    }

    function invariant_OneEffectiveBallotAndPublicAccounting() external view {
        BallotRecord memory record = votingCore.ballot(votingBallotId);
        uint32 expectedVoters;
        uint256 expectedWeight;

        for (uint256 i = 0; i < 4; ++i) {
            BallotReceipt memory voterReceipt =
                votingCore.receipt(votingBallotId, handler.voters(i));
            uint64 successfulOperations = handler.successfulOperations(i);
            uint256 snapshotWeight = handler.snapshotWeights(i);
            assertLe(successfulOperations, 3);
            assertLe(voterReceipt.replacementsUsed, 2);

            if (successfulOperations == 0) {
                assertFalse(voterReceipt.recorded);
                assertEq(voterReceipt.sequence, 0);
                assertEq(voterReceipt.replacementsUsed, 0);
                assertEq(voterReceipt.weight, 0);
                continue;
            }

            expectedVoters += 1;
            expectedWeight += snapshotWeight;
            assertTrue(voterReceipt.recorded);
            assertEq(voterReceipt.sequence, successfulOperations);
            assertEq(voterReceipt.replacementsUsed, successfulOperations - 1);
            assertEq(voterReceipt.weight, snapshotWeight);
        }

        assertEq(record.recordedVoters, expectedVoters);
        assertEq(record.recordedWeight, expectedWeight);
        assertFalse(handler.recordedVotersDecreased());
        assertFalse(handler.failedCastMutatedPublicState());
    }

    function invariant_NoBelowFloorVerdictAndSingleFinalization() external view {
        DetailedState belowState = belowFloorCore.detailedState(belowFloorBallotId);
        Result belowResult = belowFloorCore.result(belowFloorBallotId);
        assertTrue(belowState == DetailedState.Closed || belowState == DetailedState.Withheld);
        assertTrue(belowResult == Result.None || belowResult == Result.Withheld);
        assertEq(belowFloorCore.expectedVerdictHandle(belowFloorBallotId), bytes32(0));

        uint256 successfulFinalizations = handler.successfulFinalizations();
        Result finalResult = finalizationCore.result(finalizationBallotId);
        assertLe(successfulFinalizations, 1);
        assertEq(
            finalizationCore.expectedVerdictHandle(finalizationBallotId),
            handler.finalizationVerdictHandle()
        );
        if (successfulFinalizations == 0) {
            assertEq(
                uint8(finalizationCore.detailedState(finalizationBallotId)),
                uint8(DetailedState.TallyPending)
            );
            assertEq(uint8(finalResult), uint8(Result.None));
        } else {
            assertTrue(finalResult == Result.Passed || finalResult == Result.Rejected);
        }
    }

    function invariant_SafeExecutesCommittedActionAtMostOnce() external view {
        SafeProposalRecord memory record = module.proposal(safeProposalId);
        uint256 successfulExecutions = handler.successfulSafeExecutions();
        uint256 targetCalls = executionTarget.calls();
        assertLe(successfulExecutions, 1);
        assertEq(targetCalls, successfulExecutions);
        assertEq(record.executed, successfulExecutions == 1);
        assertEq(record.actionHash, handler.safeActionHash());
        assertEq(record.ballotId, handler.safeBallotId());
        assertEq(executionTarget.value(), targetCalls == 1 ? 42 : 0);
    }

    function testInvariantSetupUsesProductionContractsAndReleasedPaths() external view {
        assertGt(address(noxCompute).code.length, 0);
        assertTrue(module.isInstalled());
        assertNotEq(address(votingCore), address(belowFloorCore));
        assertNotEq(address(votingCore), address(finalizationCore));
        assertEq(
            uint8(finalizationCore.detailedState(finalizationBallotId)),
            uint8(DetailedState.TallyPending)
        );
        assertEq(
            uint8(module.confidentialCore().result(handler.safeBallotId())), uint8(Result.Passed)
        );
    }

    function _deployCoreDomains()
        private
        returns (CoreInvariantConfig memory config, address[4] memory voters)
    {
        IVotesSnapshotStrategy votesStrategy = new IVotesSnapshotStrategy();
        MerkleWeightedAllowlistStrategy merkleStrategy = new MerkleWeightedAllowlistStrategy();
        VotesTokenFixture token = new VotesTokenFixture();
        uint256[4] memory weights = [uint256(4), uint256(3), uint256(2), uint256(1)];
        voters = [address(0xA11CE), address(0xB0B), address(0xCA401), address(0xD0A)];
        vm.roll(SNAPSHOT);
        for (uint256 i = 0; i < voters.length; ++i) {
            token.mint(voters[i], weights[i]);
            vm.prank(voters[i]);
            token.delegate(voters[i]);
        }
        vm.roll(SNAPSHOT + 1);

        HostClockFixture votingHost =
            new HostClockFixture(address(votesStrategy), address(merkleStrategy), 4);
        HostClockFixture belowHost =
            new HostClockFixture(address(votesStrategy), address(merkleStrategy), 4);
        HostClockFixture finalHost =
            new HostClockFixture(address(votesStrategy), address(merkleStrategy), 4);
        (votingCore, votingBallotId) = _register(votingHost, votesStrategy, token, "voting");
        (belowFloorCore, belowFloorBallotId) =
            _register(belowHost, votesStrategy, token, "below-floor");
        (finalizationCore, finalizationBallotId) =
            _register(finalHost, votesStrategy, token, "finalization");

        config = CoreInvariantConfig({
            noxCompute: address(noxCompute),
            votingHost: votingHost,
            votingBallotId: votingBallotId,
            token: token,
            belowFloorHost: belowHost,
            belowFloorBallotId: belowFloorBallotId,
            finalizationHost: finalHost,
            finalizationBallotId: finalizationBallotId,
            voters: voters,
            snapshotWeights: weights
        });
    }

    function _deployPassedSafeProposal() private returns (SafeInvariantConfig memory config) {
        executionTarget = new InvariantSafeExecutionTarget();
        SafeAction[] memory actions = _singleAction(
            address(executionTarget), 0, abi.encodeCall(executionTarget.setValue, (42))
        );
        bytes32 safeBallotId;
        SafeBallotConfig memory ballotConfig;
        (safeProposalId, safeBallotId, ballotConfig) = _register(actions);
        _finalize(safeBallotId, ballotConfig, true);
        SafeProposalRecord memory record = module.proposal(safeProposalId);
        config = SafeInvariantConfig({
            module: module,
            safeProposalId: safeProposalId,
            target: executionTarget,
            actionHash: record.actionHash,
            ballotId: record.ballotId
        });
    }

    function _register(
        HostClockFixture host,
        IVotesSnapshotStrategy votesStrategy,
        VotesTokenFixture token,
        string memory domain
    ) private returns (ConfidentialBallotCore core, bytes32 ballotId) {
        host.setClock(VOTE_START - 1);
        core = host.confidentialCore();
        ballotId = host.register(
            RegisterBallotParams({
                hostProposalId: keccak256(abi.encode(domain, "proposal")),
                actionHash: keccak256(abi.encode(domain, "action")),
                eligibilityStrategy: address(votesStrategy),
                eligibilityConfig: abi.encode(address(token)),
                snapshot: SNAPSHOT,
                voteStart: VOTE_START,
                voteEnd: VOTE_END,
                privacyFloor: 4,
                maxReplacements: 2
            })
        );
        host.setClock(VOTE_START + 1);
    }
}
