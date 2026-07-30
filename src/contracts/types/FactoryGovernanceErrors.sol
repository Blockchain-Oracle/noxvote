// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

error FactoryDependencyCodeHashMismatch(address dependency, bytes32 expected, bytes32 actual);
error FactoryCreationCodeHashMismatch(bytes32 expected, bytes32 actual);
error FactoryInvalidGovernorToken(address token);
error FactoryTimelockRoleMismatch(bytes32 role, address account, bool expected, bool actual);
