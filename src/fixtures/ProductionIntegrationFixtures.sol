// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import { ERC20Votes } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import { Nonces } from "@openzeppelin/contracts/utils/Nonces.sol";

/// @dev Test-only execution target for Docker-backed production adapter coverage.
contract ProductionIntegrationTarget {
    uint256 public value;
    uint256 public calls;

    function setValue(uint256 nextValue) external {
        value = nextValue;
        calls += 1;
    }
}

/// @dev Test-only IVotes token for Docker-backed production Governor coverage.
contract ProductionIntegrationVotesToken is ERC20, ERC20Permit, ERC20Votes {
    constructor()
        ERC20("Production Integration Votes", "PIV")
        ERC20Permit("Production Integration Votes")
    { }

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
