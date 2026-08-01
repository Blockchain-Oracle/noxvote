/**
 * DEMO-CRITICAL C foundations: every evidence value in the verification
 * center carries its provenance so direct on-chain facts stay visually
 * distinguishable from indexer enrichment (partial-indexer honesty).
 */

export type Provenance = 'onchain' | 'indexed'

export type Evidence<T> =
  | { status: 'loading' }
  | { status: 'ready'; provenance: Provenance; value: T }
  | { status: 'unavailable'; provenance: Provenance; reason: string }
  | { status: 'mismatch'; provenance: Provenance; detail: string }

/** The eight stable evidence sections, in render order. */
export const VERIFICATION_SECTIONS = [
  'identity',
  'rules',
  'eligibility',
  'operations',
  'participation',
  'tally-request',
  'verdict-proof',
  'execution',
] as const

export type VerificationSection = (typeof VERIFICATION_SECTIONS)[number]

export function evidenceReady<T>(value: T, provenance: Provenance = 'onchain'): Evidence<T> {
  return { status: 'ready', provenance, value }
}

export function evidenceUnavailable<T>(reason: string, provenance: Provenance): Evidence<T> {
  return { status: 'unavailable', provenance, reason }
}

/** A mismatch anywhere makes the whole center prominently invalid. */
export function hasMismatch(sections: Iterable<Evidence<unknown>>): boolean {
  for (const section of sections) {
    if (section.status === 'mismatch') return true
  }
  return false
}
