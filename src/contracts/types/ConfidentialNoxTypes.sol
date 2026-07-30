// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { euint256 } from "encrypted-types/EncryptedTypes.sol";

struct EncryptedBallot {
    euint256 againstContribution;
    euint256 forContribution;
    euint256 abstainContribution;
}

struct EncryptedTotals {
    euint256 againstTotal;
    euint256 forTotal;
    euint256 abstainTotal;
}
