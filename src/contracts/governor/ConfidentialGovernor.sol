// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { ConfidentialGovernorCounting } from "./ConfidentialGovernorCounting.sol";
import { ConfidentialGovernorConfig } from "../types/GovernorGovernanceTypes.sol";

contract ConfidentialGovernor is ConfidentialGovernorCounting {
    constructor(ConfidentialGovernorConfig memory config) ConfidentialGovernorCounting(config) { }
}
