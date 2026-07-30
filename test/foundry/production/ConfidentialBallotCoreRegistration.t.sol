// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Test } from "forge-std/Test.sol";
import { ConfidentialBallotCore } from "../../../src/contracts/core/ConfidentialBallotCore.sol";
import {
    BallotRecord,
    BallotReceipt,
    DetailedState,
    RegisterBallotParams,
    Result
} from "../../../src/contracts/types/ConfidentialGovernanceTypes.sol";
import {
    BallotAlreadyExists,
    ClockModeChanged,
    DuplicateEligibilityStrategy,
    InvalidEligibilityConfig,
    InvalidEligibilityStrategyAddress,
    InvalidClockMode,
    InvalidHostAddress,
    InvalidPrivacyFloor,
    InvalidReplacementLimit,
    InvalidVotingWindow,
    OnlyHost,
    PrivacyFloorExceedsEligibility,
    UnsupportedEligibilityStrategy,
    VotingAlreadyEnded,
    WrongBallotState
} from "../../../src/contracts/types/ConfidentialGovernanceErrors.sol";
import { EligibilityStrategyFixture, HostClockFixture } from "./fixtures/CoreFixtures.sol";

contract ConfidentialBallotCoreRegistrationTest is Test {
    EligibilityStrategyFixture private firstStrategy;
    EligibilityStrategyFixture private secondStrategy;
    HostClockFixture private host;
    ConfidentialBallotCore private core;

    function setUp() external {
        firstStrategy = new EligibilityStrategyFixture();
        secondStrategy = new EligibilityStrategyFixture();
        host = new HostClockFixture(address(firstStrategy), address(secondStrategy), 4);
        core = host.confidentialCore();
        host.setClock(100);
    }

    function testRegistersImmutableCommitmentInScheduledState() external {
        RegisterBallotParams memory params = _params();
        bytes32 expectedConfigHash = core.computeConfigHash(params);
        bytes32 expectedBallotId = core.computeBallotId(params);

        bytes32 ballotId = host.register(params);
        BallotRecord memory ballot = core.ballot(ballotId);
        BallotReceipt memory emptyReceipt = core.receipt(ballotId, address(0xB0B));

        assertEq(ballotId, expectedBallotId);
        assertEq(ballot.configHash, expectedConfigHash);
        assertEq(ballot.hostProposalId, params.hostProposalId);
        assertEq(ballot.actionHash, params.actionHash);
        assertEq(ballot.eligibilityStrategy, params.eligibilityStrategy);
        assertEq(ballot.snapshot, params.snapshot);
        assertEq(ballot.voteStart, params.voteStart);
        assertEq(ballot.voteEnd, params.voteEnd);
        assertEq(ballot.privacyFloor, params.privacyFloor);
        assertEq(ballot.maxReplacements, params.maxReplacements);
        assertEq(uint8(core.detailedState(ballotId)), uint8(DetailedState.Scheduled));
        assertEq(uint8(core.result(ballotId)), uint8(Result.None));
        assertFalse(emptyReceipt.recorded);
        assertEq(core.eligibilityConfig(ballotId), params.eligibilityConfig);
        assertEq(core.host(), address(host));
    }

    function testDerivesScheduledOpenAndClosedFromHostClock() external {
        bytes32 ballotId = host.register(_params());

        host.setClock(200);
        assertEq(uint8(core.detailedState(ballotId)), uint8(DetailedState.Scheduled));
        host.setClock(201);
        assertEq(uint8(core.detailedState(ballotId)), uint8(DetailedState.Open));
        host.setClock(300);
        assertEq(uint8(core.detailedState(ballotId)), uint8(DetailedState.Open));
        host.setClock(301);
        assertEq(uint8(core.detailedState(ballotId)), uint8(DetailedState.Closed));
    }

    function testHostCanCancelOnlyBeforeOpen() external {
        bytes32 ballotId = host.register(_params());
        host.cancel(ballotId);

        assertEq(uint8(core.detailedState(ballotId)), uint8(DetailedState.Canceled));
        assertEq(uint8(core.result(ballotId)), uint8(Result.Canceled));
    }

    function testRejectsPostOpenCancellation() external {
        bytes32 ballotId = host.register(_params());
        host.setClock(201);

        vm.expectRevert(
            abi.encodeWithSelector(
                WrongBallotState.selector, ballotId, DetailedState.Scheduled, DetailedState.Open
            )
        );
        host.cancel(ballotId);
    }

    function testRejectsNonHostRegistrationAndCancellation() external {
        RegisterBallotParams memory params = _params();
        vm.expectRevert(abi.encodeWithSelector(OnlyHost.selector, address(this)));
        core.registerBallot(params);

        bytes32 ballotId = host.register(params);
        vm.expectRevert(abi.encodeWithSelector(OnlyHost.selector, address(this)));
        core.cancel(ballotId);
    }

    function testRejectsDuplicateBallot() external {
        RegisterBallotParams memory params = _params();
        bytes32 ballotId = host.register(params);
        vm.expectRevert(abi.encodeWithSelector(BallotAlreadyExists.selector, ballotId));
        host.register(params);
    }

    function testRejectsInvalidConstructionAndRegistrationConfig() external {
        vm.expectRevert(InvalidHostAddress.selector);
        new ConfidentialBallotCore(address(0), address(firstStrategy), address(secondStrategy), 4);
        vm.expectRevert(
            abi.encodeWithSelector(InvalidEligibilityStrategyAddress.selector, uint8(0))
        );
        new ConfidentialBallotCore(address(host), address(0), address(secondStrategy), 4);
        vm.expectRevert(
            abi.encodeWithSelector(DuplicateEligibilityStrategy.selector, address(firstStrategy))
        );
        new ConfidentialBallotCore(address(host), address(firstStrategy), address(firstStrategy), 4);
        vm.expectRevert(abi.encodeWithSelector(InvalidPrivacyFloor.selector, uint32(3), uint32(4)));
        new ConfidentialBallotCore(
            address(host), address(firstStrategy), address(secondStrategy), 3
        );

        RegisterBallotParams memory params = _params();
        params.eligibilityStrategy = address(0xBAD);
        vm.expectRevert(
            abi.encodeWithSelector(UnsupportedEligibilityStrategy.selector, address(0xBAD))
        );
        host.register(params);

        params = _params();
        params.voteStart = params.voteEnd;
        vm.expectRevert(
            abi.encodeWithSelector(InvalidVotingWindow.selector, params.voteStart, params.voteEnd)
        );
        host.register(params);

        params = _params();
        params.privacyFloor = 3;
        vm.expectRevert(abi.encodeWithSelector(InvalidPrivacyFloor.selector, uint32(3), uint32(4)));
        host.register(params);

        params = _params();
        params.privacyFloor = 5;
        vm.expectRevert(
            abi.encodeWithSelector(PrivacyFloorExceedsEligibility.selector, uint32(5), uint32(4))
        );
        host.register(params);

        params = _params();
        params.maxReplacements = 3;
        vm.expectRevert(abi.encodeWithSelector(InvalidReplacementLimit.selector, uint8(3)));
        host.register(params);

        params = _params();
        params.eligibilityConfig = "";
        vm.expectRevert(InvalidEligibilityConfig.selector);
        host.register(params);
    }

    function testRejectsEndedWindowAndInvalidClockMode() external {
        RegisterBallotParams memory params = _params();
        host.setClock(params.voteEnd);
        vm.expectRevert(
            abi.encodeWithSelector(VotingAlreadyEnded.selector, params.voteEnd, params.voteEnd)
        );
        host.register(params);

        host.setClock(100);
        host.setClockMode("");
        vm.expectRevert(InvalidClockMode.selector);
        host.register(params);
    }

    function testDetectsClockModeMutation() external {
        bytes32 ballotId = host.register(_params());
        bytes32 expected = keccak256(bytes("mode=timestamp"));
        bytes32 actual = keccak256(bytes("mode=blocknumber&from=default"));
        host.setClockMode("mode=blocknumber&from=default");

        vm.expectRevert(abi.encodeWithSelector(ClockModeChanged.selector, expected, actual));
        core.detailedState(ballotId);
    }

    function _params() private view returns (RegisterBallotParams memory params) {
        params = RegisterBallotParams({
            hostProposalId: keccak256("proposal-1"),
            actionHash: keccak256("action-1"),
            eligibilityStrategy: address(firstStrategy),
            eligibilityConfig: abi.encode(uint32(4)),
            snapshot: 90,
            voteStart: 200,
            voteEnd: 300,
            privacyFloor: 4,
            maxReplacements: 2
        });
    }
}
