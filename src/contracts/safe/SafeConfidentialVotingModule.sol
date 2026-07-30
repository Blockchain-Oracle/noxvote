// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import {
    IModuleManager
} from "@safe-global/safe-smart-account/contracts/interfaces/IModuleManager.sol";
import { Enum } from "@safe-global/safe-smart-account/contracts/libraries/Enum.sol";
import {
    MultiSendCallOnly
} from "@safe-global/safe-smart-account/contracts/libraries/MultiSendCallOnly.sol";
import { ConfidentialCoreHost } from "../core/ConfidentialCoreHost.sol";
import { IConfidentialHost } from "../interfaces/IConfidentialHost.sol";
import { SafeActionHashing } from "../libraries/SafeActionHashing.sol";
import { SafeMultiSendEncoding } from "../libraries/SafeMultiSendEncoding.sol";
import {
    InvalidGovernanceQuorum,
    InvalidMultiSendCallOnlyAddress,
    InvalidSafeAddress,
    MultiSendCallOnlyCodeHashMismatch,
    OnlySafe,
    SafeModuleNotEnabled,
    SafeActionMismatch,
    SafeExecutionFailed,
    SafeProposalAlreadyExecuted,
    SafeProposalNotPassed,
    UnknownSafeProposal
} from "../types/SafeGovernanceErrors.sol";
import { RegisterBallotParams, Result } from "../types/ConfidentialGovernanceTypes.sol";
import { SafeAction, SafeBallotConfig, SafeProposalRecord } from "../types/SafeGovernanceTypes.sol";

contract SafeConfidentialVotingModule is ConfidentialCoreHost, IConfidentialHost {
    address public immutable safe;
    address public immutable multiSendCallOnly;
    bytes32 public immutable multiSendCallOnlyCodeHash;

    uint256 public proposalNonce;

    mapping(bytes32 safeProposalId => SafeProposalRecord record) private _proposals;

    event SafeProposalRegistered(
        bytes32 indexed safeProposalId,
        bytes32 indexed ballotId,
        bytes32 indexed actionHash,
        uint256 governanceQuorum
    );
    event SafeProposalExecuted(bytes32 indexed safeProposalId, address indexed executor);

    modifier onlySafe() {
        if (msg.sender != safe) revert OnlySafe(msg.sender);
        _;
    }

    constructor(
        address safe_,
        address firstStrategy_,
        address secondStrategy_,
        uint32 minimumPrivacyFloor_,
        address multiSendCallOnly_
    ) ConfidentialCoreHost(firstStrategy_, secondStrategy_, minimumPrivacyFloor_) {
        if (safe_ == address(0) || safe_.code.length == 0) revert InvalidSafeAddress(safe_);
        if (multiSendCallOnly_ == address(0) || multiSendCallOnly_.code.length == 0) {
            revert InvalidMultiSendCallOnlyAddress(multiSendCallOnly_);
        }

        safe = safe_;
        multiSendCallOnly = multiSendCallOnly_;
        multiSendCallOnlyCodeHash = multiSendCallOnly_.codehash;
    }

    function registerProposal(SafeAction[] calldata actions, SafeBallotConfig calldata ballotConfig)
        external
        onlySafe
        returns (bytes32 safeProposalId, bytes32 ballotId)
    {
        if (!isInstalled()) revert SafeModuleNotEnabled(safe, address(this));
        if (ballotConfig.governanceQuorum == 0) {
            revert InvalidGovernanceQuorum(ballotConfig.governanceQuorum);
        }

        uint256 nextNonce = proposalNonce + 1;
        safeProposalId = SafeActionHashing.proposalId(block.chainid, address(this), safe, nextNonce);
        bytes32 actionHash = SafeActionHashing.hashActions(
            block.chainid, address(this), safe, safeProposalId, actions
        );

        RegisterBallotParams memory params = RegisterBallotParams({
            hostProposalId: safeProposalId,
            actionHash: actionHash,
            eligibilityStrategy: ballotConfig.eligibilityStrategy,
            eligibilityConfig: ballotConfig.eligibilityConfig,
            snapshot: ballotConfig.snapshot,
            voteStart: ballotConfig.voteStart,
            voteEnd: ballotConfig.voteEnd,
            privacyFloor: ballotConfig.privacyFloor,
            maxReplacements: ballotConfig.maxReplacements
        });
        ballotId = confidentialCore.registerBallot(params);

        proposalNonce = nextNonce;
        _proposals[safeProposalId] = SafeProposalRecord({
            ballotId: ballotId,
            actionHash: actionHash,
            governanceQuorum: ballotConfig.governanceQuorum,
            executed: false
        });
        emit SafeProposalRegistered(
            safeProposalId, ballotId, actionHash, ballotConfig.governanceQuorum
        );
    }

    function hashActions(bytes32 safeProposalId, SafeAction[] calldata actions)
        external
        view
        returns (bytes32)
    {
        return SafeActionHashing.hashActions(
            block.chainid, address(this), safe, safeProposalId, actions
        );
    }

    function execute(bytes32 safeProposalId, SafeAction[] calldata actions) external {
        SafeProposalRecord storage record = _proposals[safeProposalId];
        if (record.ballotId == bytes32(0)) revert UnknownSafeProposal(safeProposalId);
        if (!isInstalled()) revert SafeModuleNotEnabled(safe, address(this));
        if (record.executed) revert SafeProposalAlreadyExecuted(safeProposalId);

        Result result = confidentialCore.result(record.ballotId);
        if (result != Result.Passed) revert SafeProposalNotPassed(safeProposalId, result);

        bytes32 actualHash = SafeActionHashing.hashActions(
            block.chainid, address(this), safe, safeProposalId, actions
        );
        if (actualHash != record.actionHash) {
            revert SafeActionMismatch(safeProposalId, record.actionHash, actualHash);
        }

        record.executed = true;
        bool success;
        if (actions.length == 1) {
            SafeAction calldata action = actions[0];
            success = IModuleManager(safe)
                .execTransactionFromModule(
                    action.to, action.value, action.data, Enum.Operation.Call
                );
        } else {
            bytes32 actualCodeHash = multiSendCallOnly.codehash;
            if (actualCodeHash != multiSendCallOnlyCodeHash) {
                revert MultiSendCallOnlyCodeHashMismatch(
                    multiSendCallOnly, multiSendCallOnlyCodeHash, actualCodeHash
                );
            }
            bytes memory transactions = SafeMultiSendEncoding.encodeCallOnly(actions);
            bytes memory data = abi.encodeCall(MultiSendCallOnly.multiSend, (transactions));
            success = IModuleManager(safe)
                .execTransactionFromModule(multiSendCallOnly, 0, data, Enum.Operation.DelegateCall);
        }
        if (!success) revert SafeExecutionFailed(safeProposalId);
        emit SafeProposalExecuted(safeProposalId, msg.sender);
    }

    function proposal(bytes32 safeProposalId) external view returns (SafeProposalRecord memory) {
        return _proposals[safeProposalId];
    }

    function isInstalled() public view returns (bool) {
        return IModuleManager(safe).isModuleEnabled(address(this));
    }

    function confidentialClock() external view returns (uint48) {
        return uint48(block.timestamp);
    }

    function confidentialClockMode() external pure returns (string memory) {
        return "mode=timestamp";
    }

    function governanceQuorum(bytes32 safeProposalId, uint48) external view returns (uint256) {
        SafeProposalRecord storage record = _proposals[safeProposalId];
        if (record.ballotId == bytes32(0)) revert UnknownSafeProposal(safeProposalId);
        return record.governanceQuorum;
    }
}
