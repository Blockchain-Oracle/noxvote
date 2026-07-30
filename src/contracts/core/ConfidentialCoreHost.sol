// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { ConfidentialBallotCore } from "./ConfidentialBallotCore.sol";

abstract contract ConfidentialCoreHost {
    ConfidentialBallotCore public immutable confidentialCore;

    constructor(address firstStrategy, address secondStrategy, uint32 minimumPrivacyFloor) {
        confidentialCore = new ConfidentialBallotCore(
            address(this), firstStrategy, secondStrategy, minimumPrivacyFloor
        );
    }
}
