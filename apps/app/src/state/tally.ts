import type { Hex } from '../config/addresses.ts'
import { DetailedState, Result, ZERO_HANDLE, type BallotRecordView } from './chain.ts'

/** Local write/poll progress the tally screen feeds in (never invented). */
export type TallyRequestProgress =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'submitted'; txHash: Hex }

export type VerdictProofProgress =
  | { status: 'idle' }
  | { status: 'polling'; startedAt: number }
  | { status: 'ready'; decryptionProof: Hex; value: boolean }
  | { status: 'timed-out' }
  | { status: 'error'; message: string }

export type FinalizeProgress =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'rejected'; reason: string }
  | { status: 'confirmed'; txHash: Hex }

export type TallyInput = {
  loading: boolean
  detailed: DetailedState | undefined
  record: BallotRecordView | undefined
  expectedVerdictHandle: Hex | undefined
  result: Result | undefined
  request: TallyRequestProgress
  proof: VerdictProofProgress
  finalize: FinalizeProgress
}

/**
 * DEMO-CRITICAL B: the tally panel's ten-state machine as one pure projection.
 * `floor-failed` carries `terminal`: true is the contract's recorded Withheld;
 * false is a closed ballot whose public participation sits below the floor, so
 * a request would withhold (both facts are on-chain and public).
 */
export type TallyState =
  | { phase: 'loading' }
  | { phase: 'disabled'; record: BallotRecordView; opensTallyAt: number }
  | { phase: 'privacy-check'; record: BallotRecordView }
  | { phase: 'floor-failed'; record: BallotRecordView; terminal: boolean }
  | { phase: 'ready'; record: BallotRecordView }
  | { phase: 'submitting'; record: BallotRecordView; txHash?: Hex }
  | { phase: 'computing'; record: BallotRecordView; expectedVerdictHandle: Hex; startedAt?: number }
  | { phase: 'proof-ready'; record: BallotRecordView; expectedVerdictHandle: Hex; decryptionProof: Hex }
  | { phase: 'bad-proof'; record: BallotRecordView; reason: string }
  | { phase: 'timed-out'; record: BallotRecordView; expectedVerdictHandle: Hex }
  | { phase: 'finalized'; record: BallotRecordView; result: Result }

export function tallyState(input: TallyInput): TallyState {
  const { detailed, record } = input
  if (input.loading || detailed === undefined || record === undefined) return { phase: 'loading' }

  if (detailed === DetailedState.Scheduled || detailed === DetailedState.Open) {
    return { phase: 'disabled', record, opensTallyAt: record.voteEnd }
  }
  if (detailed === DetailedState.Withheld) return { phase: 'floor-failed', record, terminal: true }
  if (detailed === DetailedState.Passed || detailed === DetailedState.Rejected) {
    return { phase: 'finalized', record, result: input.result ?? Result.None }
  }
  if (detailed === DetailedState.Canceled) {
    return { phase: 'finalized', record, result: Result.Canceled }
  }

  if (detailed === DetailedState.Closed) {
    if (input.request.status === 'submitting') return { phase: 'submitting', record }
    if (input.request.status === 'submitted') {
      return { phase: 'submitting', record, txHash: input.request.txHash }
    }
    if (input.expectedVerdictHandle === undefined) return { phase: 'privacy-check', record }
    if (record.recordedVoters < record.privacyFloor) {
      return { phase: 'floor-failed', record, terminal: false }
    }
    return { phase: 'ready', record }
  }

  // TallyPending: the request is on-chain and the expected handle is stored.
  const handle = input.expectedVerdictHandle
  if (handle === undefined || handle === ZERO_HANDLE) return { phase: 'privacy-check', record }
  if (input.finalize.status === 'rejected') {
    return { phase: 'bad-proof', record, reason: input.finalize.reason }
  }
  switch (input.proof.status) {
    case 'ready':
      return {
        phase: 'proof-ready',
        record,
        expectedVerdictHandle: handle,
        decryptionProof: input.proof.decryptionProof,
      }
    case 'timed-out':
      return { phase: 'timed-out', record, expectedVerdictHandle: handle }
    case 'error':
      return { phase: 'bad-proof', record, reason: input.proof.message }
    case 'polling':
      return {
        phase: 'computing',
        record,
        expectedVerdictHandle: handle,
        startedAt: input.proof.startedAt,
      }
    case 'idle':
      return { phase: 'computing', record, expectedVerdictHandle: handle }
  }
}
