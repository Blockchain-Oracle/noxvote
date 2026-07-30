// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Nox } from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import { ebool, euint256 } from "encrypted-types/EncryptedTypes.sol";
import { EncryptedTotals } from "../types/ConfidentialNoxTypes.sol";

library ConfidentialTallyNox {
    struct TallyComputation {
        euint256 totalParticipation;
        euint256 zero;
        euint256 ballotDomainZero;
        ebool quorumReached;
        ebool forWins;
        euint256 quorumWord;
        euint256 winsWord;
        euint256 conjunction;
        ebool verdict;
    }

    function deriveVerdict(
        EncryptedTotals storage totals,
        uint256 governanceQuorum,
        bytes32 ballotId
    ) internal returns (ebool verdict) {
        TallyComputation memory tally;
        tally.totalParticipation =
            Nox.add(Nox.add(totals.againstTotal, totals.forTotal), totals.abstainTotal);
        // Preserve the plaintext total while binding every downstream handle to the ballot domain.
        tally.zero = Nox.sub(tally.totalParticipation, tally.totalParticipation);
        tally.ballotDomainZero = Nox.mul(tally.zero, Nox.toEuint256(uint256(ballotId)));
        tally.totalParticipation = Nox.add(tally.totalParticipation, tally.ballotDomainZero);
        tally.quorumReached = Nox.ge(tally.totalParticipation, Nox.toEuint256(governanceQuorum));
        tally.forWins = Nox.gt(totals.forTotal, totals.againstTotal);

        euint256 one = Nox.toEuint256(1);
        euint256 zero = Nox.toEuint256(0);
        tally.quorumWord = Nox.select(tally.quorumReached, one, zero);
        tally.winsWord = Nox.select(tally.forWins, one, zero);
        tally.conjunction = Nox.mul(tally.quorumWord, tally.winsWord);
        tally.verdict = Nox.eq(tally.conjunction, one);

        _persist(tally);
        Nox.allowPublicDecryption(tally.verdict);
        return tally.verdict;
    }

    function publicDecrypt(ebool verdict, bytes calldata decryptionProof)
        internal
        view
        returns (bool)
    {
        return Nox.publicDecrypt(verdict, decryptionProof);
    }

    function _persist(TallyComputation memory tally) private {
        Nox.allowThis(tally.totalParticipation);
        Nox.allowThis(tally.zero);
        Nox.allowThis(tally.ballotDomainZero);
        Nox.allowThis(tally.quorumReached);
        Nox.allowThis(tally.forWins);
        Nox.allowThis(tally.quorumWord);
        Nox.allowThis(tally.winsWord);
        Nox.allowThis(tally.conjunction);
        Nox.allowThis(tally.verdict);
    }
}
