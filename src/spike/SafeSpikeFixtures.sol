// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

/// @notice Observable destination for the official Safe module execution proof.
contract SafeExecutionTarget {
    uint256 public value;
    uint256 public calls;

    function setValue(uint256 newValue) external {
        value = newValue;
        calls += 1;
    }
}
