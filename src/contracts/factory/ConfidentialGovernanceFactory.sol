// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { ConfidentialGovernanceFactoryGovernor } from "./ConfidentialGovernanceFactoryGovernor.sol";

contract ConfidentialGovernanceFactory is ConfidentialGovernanceFactoryGovernor {
    constructor(address multiSendCallOnly_)
        ConfidentialGovernanceFactoryGovernor(multiSendCallOnly_)
    { }
}
