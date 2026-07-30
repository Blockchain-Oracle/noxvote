// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { IVotes } from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import { IEligibilityStrategy } from "../interfaces/IEligibilityStrategy.sol";
import {
    EmptyEligibilityProofRequired,
    InvalidEligibilityConfigLength,
    InvalidEligibilityToken,
    InvalidEligibilityVoter,
    ZeroEligibilityWeight
} from "../types/EligibilityErrors.sol";

contract IVotesSnapshotStrategy is IEligibilityStrategy {
    uint256 private constant CONFIG_LENGTH = 32;

    function validateConfig(bytes calldata config) external view returns (uint32 eligibleCount) {
        _token(config);
        return 0;
    }

    function weightOf(address voter, uint48 snapshot, bytes calldata config, bytes calldata proof)
        external
        view
        returns (uint256 weight)
    {
        if (voter == address(0)) revert InvalidEligibilityVoter();
        if (proof.length != 0) revert EmptyEligibilityProofRequired(proof.length);

        weight = IVotes(_token(config)).getPastVotes(voter, snapshot);
        if (weight == 0) revert ZeroEligibilityWeight(voter);
    }

    function _token(bytes calldata config) private view returns (address token) {
        if (config.length != CONFIG_LENGTH) {
            revert InvalidEligibilityConfigLength(CONFIG_LENGTH, config.length);
        }
        token = abi.decode(config, (address));
        if (token == address(0) || token.code.length == 0) {
            revert InvalidEligibilityToken(token);
        }
    }
}
