// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Result } from "./ConfidentialGovernanceTypes.sol";

error InvalidSafeAddress(address safe);
error InvalidMultiSendCallOnlyAddress(address multiSendCallOnly);
error OnlySafe(address caller);
error SafeModuleNotEnabled(address safe, address module);
error InvalidSafeActionCount(uint256 count);
error InvalidSafeActionTarget(uint256 index);
error InvalidGovernanceQuorum(uint256 quorum);
error UnknownSafeProposal(bytes32 safeProposalId);
error SafeActionMismatch(bytes32 safeProposalId, bytes32 expected, bytes32 actual);
error SafeProposalNotPassed(bytes32 safeProposalId, Result result);
error SafeProposalAlreadyExecuted(bytes32 safeProposalId);
error MultiSendCallOnlyCodeHashMismatch(address target, bytes32 expected, bytes32 actual);
error SafeExecutionFailed(bytes32 safeProposalId);
