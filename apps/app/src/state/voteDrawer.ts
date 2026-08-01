import { DetailedState, type BallotRecordView, type BallotReceiptView } from './chain.ts'
import type { VoterStanding } from './proposalDetail.ts'

/**
 * Screen 8's availability machine as one pure projection. `choice selected`
 * is drawer-local UI state on top of `ready`; a recorded voter re-entering
 * the drawer is a replacement (sequence + 1, empty proof) and hits the
 * ceiling check first.
 */
export type VoteDrawerState =
  | { phase: 'disconnected' }
  | { phase: 'wrong-network'; expectedChainId: number }
  | { phase: 'checking' }
  | { phase: 'ineligible'; snapshot: number }
  | { phase: 'not-open' }
  | { phase: 'ceiling'; maxReplacements: number }
  | { phase: 'ready'; weight: bigint; sequence: bigint; replacement: boolean; replacementsLeft: number }

export function voteDrawerState(
  detailed: DetailedState,
  record: BallotRecordView,
  standing: VoterStanding,
  receipt: BallotReceiptView | undefined,
): VoteDrawerState {
  if (standing.kind === 'disconnected') return { phase: 'disconnected' }
  if (standing.kind === 'wrong-network')
    return { phase: 'wrong-network', expectedChainId: standing.expectedChainId }
  if (detailed !== DetailedState.Open) return { phase: 'not-open' }
  if (standing.kind === 'checking') return { phase: 'checking' }
  if (standing.kind === 'ineligible') return { phase: 'ineligible', snapshot: record.snapshot }

  if (receipt?.recorded) {
    if (receipt.replacementsUsed >= record.maxReplacements) {
      return { phase: 'ceiling', maxReplacements: record.maxReplacements }
    }
    return {
      phase: 'ready',
      weight: standing.weight,
      sequence: receipt.sequence + 1n,
      replacement: true,
      replacementsLeft: record.maxReplacements - receipt.replacementsUsed,
    }
  }
  return {
    phase: 'ready',
    weight: standing.weight,
    sequence: 1n,
    replacement: false,
    replacementsLeft: record.maxReplacements,
  }
}
