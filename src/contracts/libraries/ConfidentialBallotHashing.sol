// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { RegisterBallotParams } from "../types/ConfidentialGovernanceTypes.sol";
import { ConfidentialGovernanceVersion } from "./ConfidentialGovernanceVersion.sol";

library ConfidentialBallotHashing {
    bytes32 internal constant CONFIG_TYPEHASH = keccak256(
        "ConfidentialBallotConfig(address eligibilityStrategy,bytes32 eligibilityConfigHash,bytes32 clockModeHash,uint48 snapshot,uint48 voteStart,uint48 voteEnd,uint32 privacyFloor,uint8 maxReplacements,uint16 rulesVersion)"
    );
    bytes32 internal constant BALLOT_TYPEHASH = keccak256(
        "ConfidentialBallot(uint256 chainId,address core,address host,bytes32 hostProposalId,bytes32 actionHash,bytes32 configHash)"
    );

    function configHash(RegisterBallotParams memory params, bytes32 clockModeHash)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(
            abi.encode(
                CONFIG_TYPEHASH,
                params.eligibilityStrategy,
                keccak256(params.eligibilityConfig),
                clockModeHash,
                params.snapshot,
                params.voteStart,
                params.voteEnd,
                params.privacyFloor,
                params.maxReplacements,
                ConfidentialGovernanceVersion.RULES_VERSION
            )
        );
    }

    function ballotId(
        uint256 chainId,
        address core,
        address host,
        RegisterBallotParams memory params,
        bytes32 committedConfigHash
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                BALLOT_TYPEHASH,
                chainId,
                core,
                host,
                params.hostProposalId,
                params.actionHash,
                committedConfigHash
            )
        );
    }
}
