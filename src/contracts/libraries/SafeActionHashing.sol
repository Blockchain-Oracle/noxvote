// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { InvalidSafeActionCount, InvalidSafeActionTarget } from "../types/SafeGovernanceErrors.sol";
import { SafeAction } from "../types/SafeGovernanceTypes.sol";

library SafeActionHashing {
    bytes32 internal constant ACTION_TYPEHASH =
        keccak256("SafeAction(address to,uint256 value,bytes32 dataHash)");
    bytes32 internal constant BUNDLE_TYPEHASH = keccak256(
        "SafeActionBundle(uint256 chainId,address module,address safe,bytes32 safeProposalId,bytes32 actionsHash)"
    );

    function proposalId(uint256 chainId, address module, address safe, uint256 proposalNonce)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(chainId, module, safe, proposalNonce));
    }

    function hashActions(
        uint256 chainId,
        address module,
        address safe,
        bytes32 safeProposalId,
        SafeAction[] calldata actions
    ) internal pure returns (bytes32) {
        uint256 actionCount = actions.length;
        if (actionCount == 0) revert InvalidSafeActionCount(actionCount);

        bytes32[] memory actionHashes = new bytes32[](actionCount);
        for (uint256 i = 0; i < actionCount; ++i) {
            SafeAction calldata action = actions[i];
            if (action.to == address(0)) revert InvalidSafeActionTarget(i);
            actionHashes[i] = keccak256(
                abi.encode(ACTION_TYPEHASH, action.to, action.value, keccak256(action.data))
            );
        }

        return keccak256(
            abi.encode(
                BUNDLE_TYPEHASH,
                chainId,
                module,
                safe,
                safeProposalId,
                keccak256(abi.encode(actionHashes))
            )
        );
    }
}
