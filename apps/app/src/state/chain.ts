import type { Hex } from '../config/addresses.ts'

/** Mirrors ConfidentialGovernanceTypes.sol — numeric values are the contract's. */
export const DetailedState = {
  Uninitialized: 0,
  Scheduled: 1,
  Open: 2,
  Closed: 3,
  TallyPending: 4,
  Withheld: 5,
  Rejected: 6,
  Passed: 7,
  Canceled: 8,
} as const
export type DetailedState = (typeof DetailedState)[keyof typeof DetailedState]

export const Result = {
  None: 0,
  Withheld: 1,
  Rejected: 2,
  Passed: 3,
  Canceled: 4,
} as const
export type Result = (typeof Result)[keyof typeof Result]

/** `ballot(ballotId)` as viem returns it (uint48/uint32/uint8 → number). */
export type BallotRecordView = {
  hostProposalId: Hex
  actionHash: Hex
  configHash: Hex
  clockModeHash: Hex
  eligibilityStrategy: Hex
  snapshot: number
  voteStart: number
  voteEnd: number
  recordedWeight: bigint
  privacyFloor: number
  recordedVoters: number
  maxReplacements: number
  storedState: number
}

/** `receipt(ballotId, voter)` as viem returns it (uint64 → bigint). */
export type BallotReceiptView = {
  weight: bigint
  sequence: bigint
  replacementsUsed: number
  recorded: boolean
}

export const ZERO_HANDLE: Hex = `0x${'00'.repeat(32)}`

export function isTerminal(state: DetailedState): boolean {
  return (
    state === DetailedState.Withheld ||
    state === DetailedState.Rejected ||
    state === DetailedState.Passed ||
    state === DetailedState.Canceled
  )
}
