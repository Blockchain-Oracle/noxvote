// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Governor } from "@openzeppelin/contracts/governance/Governor.sol";

/// @notice Compile/test probe for disabling every OZ Governor 5.6.1 plaintext ballot route.
/// @dev It is not a voting implementation. The async state mapping remains an explicit design issue.
contract GovernorCompatibilityProbe is Governor {
    error PlaintextVoteDisabled();

    constructor() Governor("Confidential Governor Compatibility Probe") { }

    function castVote(uint256, uint8) public pure override returns (uint256) {
        revert PlaintextVoteDisabled();
    }

    function castVoteWithReason(uint256, uint8, string calldata)
        public
        pure
        override
        returns (uint256)
    {
        revert PlaintextVoteDisabled();
    }

    function castVoteWithReasonAndParams(uint256, uint8, string calldata, bytes memory)
        public
        pure
        override
        returns (uint256)
    {
        revert PlaintextVoteDisabled();
    }

    function castVoteBySig(uint256, uint8, address, bytes memory)
        public
        pure
        override
        returns (uint256)
    {
        revert PlaintextVoteDisabled();
    }

    function castVoteWithReasonAndParamsBySig(
        uint256,
        uint8,
        address,
        string calldata,
        bytes memory,
        bytes memory
    ) public pure override returns (uint256) {
        revert PlaintextVoteDisabled();
    }

    function COUNTING_MODE() public pure override returns (string memory) {
        return "support=confidential-nox&quorum=verdict-only";
    }

    function hasVoted(uint256, address) public pure override returns (bool) {
        return false;
    }

    function votingDelay() public pure override returns (uint256) {
        return 1;
    }

    function votingPeriod() public pure override returns (uint256) {
        return 10;
    }

    function quorum(uint256) public pure override returns (uint256) {
        return 0;
    }

    function clock() public view override returns (uint48) {
        return uint48(block.number);
    }

    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=blocknumber&from=default";
    }

    function _quorumReached(uint256) internal pure override returns (bool) {
        return false;
    }

    function _voteSucceeded(uint256) internal pure override returns (bool) {
        return false;
    }

    function _getVotes(address, uint256, bytes memory) internal pure override returns (uint256) {
        return 0;
    }

    function _countVote(uint256, address, uint8, uint256, bytes memory)
        internal
        pure
        override
        returns (uint256)
    {
        revert PlaintextVoteDisabled();
    }

    function _castVote(uint256, address, uint8, string memory)
        internal
        pure
        override
        returns (uint256)
    {
        revert PlaintextVoteDisabled();
    }

    function _castVote(uint256, address, uint8, string memory, bytes memory)
        internal
        pure
        override
        returns (uint256)
    {
        revert PlaintextVoteDisabled();
    }
}
