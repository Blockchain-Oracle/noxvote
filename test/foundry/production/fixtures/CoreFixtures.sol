// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { ConfidentialCoreHost } from "../../../../src/contracts/core/ConfidentialCoreHost.sol";
import { IConfidentialHost } from "../../../../src/contracts/interfaces/IConfidentialHost.sol";
import {
    IEligibilityStrategy
} from "../../../../src/contracts/interfaces/IEligibilityStrategy.sol";
import {
    RegisterBallotParams
} from "../../../../src/contracts/types/ConfidentialGovernanceTypes.sol";

contract EligibilityStrategyFixture is IEligibilityStrategy {
    error InvalidFixtureConfig();

    function validateConfig(bytes calldata config) external pure returns (uint32 eligibleCount) {
        if (config.length != 32) revert InvalidFixtureConfig();
        eligibleCount = abi.decode(config, (uint32));
    }

    function weightOf(address, uint48, bytes calldata config, bytes calldata)
        external
        pure
        returns (uint256)
    {
        if (config.length != 32) revert InvalidFixtureConfig();
        return 1;
    }
}

contract HostClockFixture is ConfidentialCoreHost, IConfidentialHost {
    uint48 private currentClock;
    string private currentMode = "mode=timestamp";
    uint256 private currentQuorum = 1;

    constructor(address firstStrategy, address secondStrategy, uint32 minimumPrivacyFloor)
        ConfidentialCoreHost(firstStrategy, secondStrategy, minimumPrivacyFloor)
    { }

    function register(RegisterBallotParams calldata params) external returns (bytes32) {
        return confidentialCore.registerBallot(params);
    }

    function cancel(bytes32 ballotId) external {
        confidentialCore.cancel(ballotId);
    }

    function setClock(uint48 newClock) external {
        currentClock = newClock;
    }

    function setClockMode(string calldata newMode) external {
        currentMode = newMode;
    }

    function setQuorum(uint256 newQuorum) external {
        currentQuorum = newQuorum;
    }

    function confidentialClock() external view returns (uint48) {
        return currentClock;
    }

    function confidentialClockMode() external view returns (string memory) {
        return currentMode;
    }

    function governanceQuorum(bytes32, uint48) external view returns (uint256) {
        return currentQuorum;
    }
}
