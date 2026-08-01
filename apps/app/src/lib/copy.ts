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

/** The ten proposal-list lifecycle labels, exactly as the surface map names them. */
export const LIFECYCLE_LABELS = {
  scheduled: 'Scheduled',
  open: 'Open',
  closed: 'Closed',
  computing: 'Computing',
  withheld: COPY.resultWithheld,
  passed: 'Passed',
  rejected: 'Rejected',
  executed: 'Executed',
  tallyFailed: 'Tally failed',
  executionFailed: 'Execution failed',
} as const
