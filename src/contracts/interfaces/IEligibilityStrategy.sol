// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

interface IEligibilityStrategy {
    function validateConfig(bytes calldata config) external view returns (uint32 eligibleCount);

    function weightOf(address voter, uint48 snapshot, bytes calldata config, bytes calldata proof)
        external
        view
        returns (uint256);
}
