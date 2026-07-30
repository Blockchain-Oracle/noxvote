// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

interface IConfidentialHost {
    function confidentialClock() external view returns (uint48);

    function confidentialClockMode() external view returns (string memory);

    function governanceQuorum(bytes32 hostProposalId, uint48 snapshot)
        external
        view
        returns (uint256);
}
