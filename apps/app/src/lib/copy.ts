/**
 * The copy laws (SPEC R7), verbatim from the product surface map. Every
 * law-governed string renders from this module so a single grep audits the
 * whole app. The banned-vocabulary list lives in the surface map — do not
 * restate banned terms here or anywhere else in source.
 */

export const COPY = {
  /** Near every voting action. */
  promise: 'Your wallet and participation are public; your choice is private.',
  /** In the replacement flow, always. */
  replacementWarning:
    'Changing your vote can help you recover from pressure, but the replacement is publicly visible.',
  /** Wherever totals would render — never blank, zero, or "unavailable". */
  totalsNotDisclosed: 'Exact totals are not disclosed',
  /** The privacy-floor branch — never framed as a failed quorum. */
  resultWithheld: 'Result withheld',
  /** The deliberately sealed running result. */
  hiddenByDesign: 'Hidden by design',
  /** Recorded confirmation on the proposal detail. */
  ballotRecorded: 'Your encrypted ballot is recorded',
  /** On every successful receipt state. */
  receiptLimit: 'This confirms operation status, not your plaintext choice',
  /** The honest input trust boundary: Gateway-side encryption, stated plainly. */
  gatewayPreparation:
    'The Handle Gateway prepares the encrypted handle before your wallet transaction. The SDK sends your encoded choice to the attested Gateway operated by iExec; it is not encrypted in this page.',
  /** The author's publish-time trust acknowledgement (screen 6). */
  trustAcknowledgement:
    'I understand the trust boundary: the Handle Gateway sees each encoded choice before encrypting it, and NoxVote does not promise anonymity, receipt-freeness, or a full tally proof.',
} as const

/** Ballot progress overlay: ordered stage names (never a fake percentage). */
export const BALLOT_STAGES = [
  'Preparing encrypted handle',
  'Ready for wallet',
  'Submitting',
  'Confidential computation',
  'Recorded',
] as const

export type BallotStageName = (typeof BALLOT_STAGES)[number]

/** The eleven proposal-list lifecycle labels, exactly as the surface map
 * names them (Canceled adopted in the 2026-08-01 reconciliation addendum).
 * `tallyFailed`/`executionFailed` surface only in the tally/execution panels —
 * the contract's DetailedState enum has no failed states, so they are not
 * list-chip labels. `unknown` is the honest fallback for an unreadable state. */
export const LIFECYCLE_LABELS = {
  scheduled: 'Scheduled',
  open: 'Open',
  closed: 'Closed',
  computing: 'Computing',
  withheld: COPY.resultWithheld,
  passed: 'Passed',
  rejected: 'Rejected',
  executed: 'Executed',
  canceled: 'Canceled',
  tallyFailed: 'Tally failed',
  executionFailed: 'Execution failed',
  unknown: 'Unknown',
} as const
