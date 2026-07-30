// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Nox } from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import { ebool, euint16, euint256, externalEuint16 } from "encrypted-types/EncryptedTypes.sol";
import { EncryptedBallot, EncryptedTotals } from "../types/ConfidentialNoxTypes.sol";

library ConfidentialBallotNox {
    struct VoteComputation {
        euint16 choice;
        ebool isAgainst;
        ebool isFor;
        euint256 againstContribution;
        euint256 forContribution;
        euint256 abstainContribution;
    }

    function record(
        EncryptedBallot storage previousBallot,
        EncryptedTotals storage currentTotals,
        bool replacement,
        externalEuint16 externalChoice,
        bytes calldata handleProof,
        uint256 weight
    ) internal {
        VoteComputation memory vote = _computeVote(externalChoice, handleProof, weight);
        EncryptedTotals memory updatedTotals =
            _updatedTotals(previousBallot, currentTotals, replacement, vote);
        _persist(vote, updatedTotals);

        previousBallot.againstContribution = vote.againstContribution;
        previousBallot.forContribution = vote.forContribution;
        previousBallot.abstainContribution = vote.abstainContribution;
        currentTotals.againstTotal = updatedTotals.againstTotal;
        currentTotals.forTotal = updatedTotals.forTotal;
        currentTotals.abstainTotal = updatedTotals.abstainTotal;
    }

    function _computeVote(
        externalEuint16 externalChoice,
        bytes calldata handleProof,
        uint256 weight
    ) private returns (VoteComputation memory vote) {
        vote.choice = Nox.fromExternal(externalChoice, handleProof);
        vote.isAgainst = Nox.eq(vote.choice, Nox.toEuint16(0));
        vote.isFor = Nox.eq(vote.choice, Nox.toEuint16(1));

        euint256 encryptedWeight = Nox.toEuint256(weight);
        euint256 zero = Nox.toEuint256(0);
        vote.againstContribution = Nox.select(vote.isAgainst, encryptedWeight, zero);
        vote.forContribution = Nox.select(vote.isFor, encryptedWeight, zero);
        vote.abstainContribution =
            Nox.sub(Nox.sub(encryptedWeight, vote.againstContribution), vote.forContribution);
    }

    function _updatedTotals(
        EncryptedBallot storage previousBallot,
        EncryptedTotals storage currentTotals,
        bool replacement,
        VoteComputation memory vote
    ) private returns (EncryptedTotals memory updated) {
        if (replacement) {
            updated.againstTotal = Nox.add(
                Nox.sub(currentTotals.againstTotal, previousBallot.againstContribution),
                vote.againstContribution
            );
            updated.forTotal = Nox.add(
                Nox.sub(currentTotals.forTotal, previousBallot.forContribution),
                vote.forContribution
            );
            updated.abstainTotal = Nox.add(
                Nox.sub(currentTotals.abstainTotal, previousBallot.abstainContribution),
                vote.abstainContribution
            );
        } else {
            updated.againstTotal = Nox.add(currentTotals.againstTotal, vote.againstContribution);
            updated.forTotal = Nox.add(currentTotals.forTotal, vote.forContribution);
            updated.abstainTotal = Nox.add(currentTotals.abstainTotal, vote.abstainContribution);
        }
    }

    function _persist(VoteComputation memory vote, EncryptedTotals memory updatedTotals) private {
        Nox.allowThis(vote.choice);
        Nox.allowThis(vote.isAgainst);
        Nox.allowThis(vote.isFor);
        Nox.allowThis(vote.againstContribution);
        Nox.allowThis(vote.forContribution);
        Nox.allowThis(vote.abstainContribution);
        Nox.allowThis(updatedTotals.againstTotal);
        Nox.allowThis(updatedTotals.forTotal);
        Nox.allowThis(updatedTotals.abstainTotal);
    }
}
