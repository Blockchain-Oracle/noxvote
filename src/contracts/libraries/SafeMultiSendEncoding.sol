// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { SafeAction } from "../types/SafeGovernanceTypes.sol";

library SafeMultiSendEncoding {
    uint256 private constant ENTRY_HEADER_LENGTH = 85;

    function encodeCallOnly(SafeAction[] calldata actions)
        internal
        pure
        returns (bytes memory transactions)
    {
        uint256 actionCount = actions.length;
        uint256 encodedLength;
        for (uint256 i = 0; i < actionCount; ++i) {
            encodedLength += ENTRY_HEADER_LENGTH + actions[i].data.length;
        }

        transactions = new bytes(encodedLength);
        uint256 offset;
        for (uint256 i = 0; i < actionCount; ++i) {
            SafeAction calldata action = actions[i];
            bytes calldata actionData = action.data;
            address target = action.to;
            uint256 value = action.value;
            assembly ("memory-safe") {
                let cursor := add(add(transactions, 0x20), offset)
                // Official MultiSend operation 0 is Call; operation 1 is DelegateCall.
                mstore8(cursor, 0)
                mstore(add(cursor, 0x01), shl(0x60, target))
                mstore(add(cursor, 0x15), value)
                mstore(add(cursor, 0x35), actionData.length)
                calldatacopy(add(cursor, 0x55), actionData.offset, actionData.length)
            }
            offset += ENTRY_HEADER_LENGTH + actionData.length;
        }
    }
}
