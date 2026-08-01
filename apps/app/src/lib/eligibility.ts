import { encodeAbiParameters } from 'viem'
import { profile, type Hex } from '../config/addresses.ts'

/**
 * The eligibility proof for a first cast, exactly as the proven runner builds
 * it: Merkle allowlist ballots encode `(uint256 weight, bytes32[] siblings)`
 * from organizer-provided material; token-snapshot ballots pass `0x` (the
 * strategy resolves weight from the snapshot). The same bytes serve both the
 * strategy's `weightOf` read and `castVote`. Replacements always send `0x`.
 */
export function firstCastEligibilityProof(voter: Hex | undefined): Hex {
  if (!voter || profile.kind !== 'local' || !profile.eligibility) return '0x'
  const entry = profile.eligibility[voter.toLowerCase()]
  if (!entry) return '0x'
  return encodeAbiParameters(
    [{ type: 'uint256' }, { type: 'bytes32[]' }],
    [BigInt(entry.weight), entry.proof],
  )
}
