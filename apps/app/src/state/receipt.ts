import type { Hex } from '../config/addresses.ts'
import type { BallotReceiptView } from './chain.ts'
import type { CastState } from '../write/castVote.ts'

/**
 * Screen 10's states as one pure projection over the local operation machine
 * and the chain's own receipt. A delayed operation stays `submitted` or
 * `computing` — nothing converts to a recorded state before the chain says so.
 */
export type OperationReceiptState =
  | { phase: 'none' }
  | { phase: 'submitted'; txHash?: Hex }
  | { phase: 'computing'; txHash: Hex }
  | { phase: 'effective'; sequence: bigint; txHash?: Hex; supersedes: bigint | null }
  | { phase: 'superseded'; sequence: bigint; newestSequence: bigint; txHash?: Hex }
  | { phase: 'rejected'; reason: string }
  | { phase: 'timed-out'; txHash?: Hex }
  | { phase: 'stale'; reason: string }

export function operationReceiptState(
  cast: CastState,
  chain: BallotReceiptView | undefined,
): OperationReceiptState {
  switch (cast.stage) {
    case 'preparing':
    case 'wallet':
      return { phase: 'submitted' }
    case 'submitting':
      return { phase: 'submitted', txHash: cast.txHash }
    case 'computing':
      return { phase: 'computing', txHash: cast.txHash }
    case 'recorded': {
      // The chain may already hold a newer operation (another tab or device
      // replaced this one) — then this receipt's own status is Superseded.
      if (chain?.recorded && chain.sequence > cast.sequence) {
        return {
          phase: 'superseded',
          sequence: cast.sequence,
          newestSequence: chain.sequence,
          txHash: cast.txHash,
        }
      }
      return {
        phase: 'effective',
        sequence: cast.sequence,
        txHash: cast.txHash,
        supersedes: cast.sequence > 1n ? cast.sequence - 1n : null,
      }
    }
    case 'failed': {
      if (/sequence/i.test(cast.message) && chain?.recorded) {
        return {
          phase: 'stale',
          reason: `The chain already holds sequence ${chain.sequence}; this operation's sequence is no longer valid.`,
        }
      }
      if (/timed? ?out/i.test(cast.message)) return { phase: 'timed-out' }
      return { phase: 'rejected', reason: cast.message }
    }
    case 'idle': {
      if (chain?.recorded) {
        return {
          phase: 'effective',
          sequence: chain.sequence,
          supersedes: chain.replacementsUsed > 0 ? chain.sequence - 1n : null,
        }
      }
      return { phase: 'none' }
    }
  }
}
