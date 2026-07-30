// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Test } from "forge-std/Test.sol";
import { ConfidentialBallotCore } from "../../../src/contracts/core/ConfidentialBallotCore.sol";
import { RegisterBallotParams } from "../../../src/contracts/types/ConfidentialGovernanceTypes.sol";
import { EligibilityStrategyFixture, HostClockFixture } from "./fixtures/CoreFixtures.sol";

contract ConfidentialBallotCoreHashTest is Test {
    EligibilityStrategyFixture private firstStrategy;
    EligibilityStrategyFixture private secondStrategy;
    HostClockFixture private host;
    ConfidentialBallotCore private core;

    function setUp() external {
        firstStrategy = new EligibilityStrategyFixture();
        secondStrategy = new EligibilityStrategyFixture();
        host = new HostClockFixture(address(firstStrategy), address(secondStrategy), 4);
        core = host.confidentialCore();
    }

    function testSeparatesChainCoreAndHostDomains() external {
        RegisterBallotParams memory params = _params();
        bytes32 original = core.computeBallotId(params);

        vm.chainId(block.chainid + 1);
        assertNotEq(core.computeBallotId(params), original);

        HostClockFixture otherHost =
            new HostClockFixture(address(firstStrategy), address(secondStrategy), 4);
        assertNotEq(otherHost.confidentialCore().computeBallotId(params), original);
    }

    function testSeparatesStrategyAndClockMode() external {
        RegisterBallotParams memory params = _params();
        bytes32 original = core.computeBallotId(params);

        params.eligibilityStrategy = address(secondStrategy);
        assertNotEq(core.computeBallotId(params), original);

        params = _params();
        host.setClockMode("mode=blocknumber&from=default");
        assertNotEq(core.computeBallotId(params), original);
    }

    function testFuzzSeparatesProposalActionAndConfiguration(
        bytes32 proposalId,
        bytes32 actionHash,
        uint48 snapshot,
        uint48 start,
        uint48 end,
        uint32 floor,
        uint8 replacements,
        bytes calldata config
    ) external view {
        RegisterBallotParams memory params = _params();
        bytes32 original = core.computeBallotId(params);

        params.hostProposalId = _differentBytes32(params.hostProposalId, proposalId);
        assertNotEq(core.computeBallotId(params), original);
        params = _params();
        params.actionHash = _differentBytes32(params.actionHash, actionHash);
        assertNotEq(core.computeBallotId(params), original);
        params = _params();
        params.snapshot = _differentUint48(params.snapshot, snapshot);
        assertNotEq(core.computeBallotId(params), original);
        params = _params();
        params.voteStart = _differentUint48(params.voteStart, start);
        assertNotEq(core.computeBallotId(params), original);
        params = _params();
        params.voteEnd = _differentUint48(params.voteEnd, end);
        assertNotEq(core.computeBallotId(params), original);
        params = _params();
        params.privacyFloor = _differentUint32(params.privacyFloor, floor);
        assertNotEq(core.computeBallotId(params), original);
        params = _params();
        params.maxReplacements = _differentUint8(params.maxReplacements, replacements);
        assertNotEq(core.computeBallotId(params), original);
        params = _params();
        params.eligibilityConfig = abi.encode(keccak256(config), config.length);
        if (keccak256(params.eligibilityConfig) == keccak256(_params().eligibilityConfig)) {
            params.eligibilityConfig = hex"01";
        }
        assertNotEq(core.computeBallotId(params), original);
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

    function _differentBytes32(bytes32 original, bytes32 candidate) private pure returns (bytes32) {
        return candidate == original ? bytes32(uint256(original) ^ 1) : candidate;
    }

    function _differentUint48(uint48 original, uint48 candidate) private pure returns (uint48) {
        return candidate == original ? original ^ 1 : candidate;
    }

    function _differentUint32(uint32 original, uint32 candidate) private pure returns (uint32) {
        return candidate == original ? original ^ 1 : candidate;
    }

    function _differentUint8(uint8 original, uint8 candidate) private pure returns (uint8) {
        return candidate == original ? original ^ 1 : candidate;
    }
}
