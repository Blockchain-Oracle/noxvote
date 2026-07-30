// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Nox } from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import { euint16, externalEuint16 } from "encrypted-types/EncryptedTypes.sol";

/// @notice Bounded Phase-0 probe for the released Handle Gateway → fromExternal path.
/// @dev This is feasibility evidence, not the product contract architecture.
contract NoxInputProbe {
    euint16 private _latestChoice;

    event ChoiceHandleRecorded(address indexed voter, bytes32 indexed handle);

    function recordChoice(externalEuint16 externalChoice, bytes calldata handleProof) external {
        euint16 choice = Nox.fromExternal(externalChoice, handleProof);
        Nox.allowThis(choice);
        _latestChoice = choice;

        emit ChoiceHandleRecorded(msg.sender, euint16.unwrap(choice));
    }

    function latestChoiceHandle() external view returns (bytes32) {
        return euint16.unwrap(_latestChoice);
    }
}
