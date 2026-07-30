// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Test } from "forge-std/Test.sol";
import { Enum } from "@safe-global/safe-smart-account/contracts/libraries/Enum.sol";
import { SafeMultiSendEncoding } from "../../../src/contracts/libraries/SafeMultiSendEncoding.sol";
import { SafeAction } from "../../../src/contracts/types/SafeGovernanceTypes.sol";

contract SafeMultiSendEncodingHarness {
    function encode(SafeAction[] calldata actions) external pure returns (bytes memory) {
        return SafeMultiSendEncoding.encodeCallOnly(actions);
    }
}

contract SafeMultiSendEncodingTest is Test {
    function testMatchesOfficialPackedFormatAndFixesEveryOperationToCall() public {
        SafeAction[] memory actions = new SafeAction[](3);
        actions[0] = SafeAction({ to: address(0xA11CE), value: 1, data: "" });
        actions[1] = SafeAction({ to: address(0xB0B), value: 2, data: hex"010203" });
        actions[2] = SafeAction({
            to: address(0xCA401), value: type(uint256).max, data: abi.encode("variable-length")
        });
        bytes memory expected = bytes.concat(
            _encodeEntry(actions[0]), _encodeEntry(actions[1]), _encodeEntry(actions[2])
        );

        bytes memory actual = new SafeMultiSendEncodingHarness().encode(actions);

        assertEq(actual, expected);
        assertEq(uint8(actual[0]), uint8(Enum.Operation.Call));
        assertEq(uint8(actual[85]), uint8(Enum.Operation.Call));
        assertEq(uint8(actual[173]), uint8(Enum.Operation.Call));
    }

    function _encodeEntry(SafeAction memory action) private pure returns (bytes memory) {
        return abi.encodePacked(
            uint8(Enum.Operation.Call), action.to, action.value, action.data.length, action.data
        );
    }
}
