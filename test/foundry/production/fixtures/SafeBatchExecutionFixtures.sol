// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import {
    SafeConfidentialVotingModule
} from "../../../../src/contracts/safe/SafeConfidentialVotingModule.sol";
import { SafeAction } from "../../../../src/contracts/types/SafeGovernanceTypes.sol";
import { DirectSafeExecutionTarget } from "./SafeExecutionFixtures.sol";

contract OrderedSafeExecutionTarget {
    uint256[] private _values;
    address public caller;
    uint256 public received;

    function record(uint256 newValue) external payable {
        _values.push(newValue);
        caller = msg.sender;
        received += msg.value;
    }

    function valueAt(uint256 index) external view returns (uint256) {
        return _values[index];
    }

    function calls() external view returns (uint256) {
        return _values.length;
    }
}

contract ReentrantSafeBatchExecutionTarget {
    SafeConfidentialVotingModule private module;
    bytes32 private safeProposalId;
    DirectSafeExecutionTarget private trailingTarget;
    bool public reentrySucceeded;
    uint256 public calls;

    function arm(
        SafeConfidentialVotingModule module_,
        bytes32 safeProposalId_,
        DirectSafeExecutionTarget trailingTarget_
    ) external {
        module = module_;
        safeProposalId = safeProposalId_;
        trailingTarget = trailingTarget_;
    }

    function attack() external {
        SafeAction[] memory actions = new SafeAction[](2);
        actions[0] =
            SafeAction({ to: address(this), value: 0, data: abi.encodeCall(this.attack, ()) });
        actions[1] = SafeAction({
            to: address(trailingTarget),
            value: 0,
            data: abi.encodeCall(trailingTarget.setValue, (99))
        });
        try module.execute(safeProposalId, actions) {
            reentrySucceeded = true;
        } catch { }
        calls += 1;
    }
}
