import type { Hex } from '../config/addresses.ts'
import { DetailedState, type BallotRecordView, type BallotReceiptView } from './chain.ts'

/** What the connected wallet knows about its own standing on this ballot. */
export type VoterStanding =
  | { kind: 'disconnected' }
  | { kind: 'wrong-network'; walletChainId: number; expectedChainId: number }
  | { kind: 'checking' }
  | { kind: 'ineligible'; snapshot: number }
  | { kind: 'eligible'; weight: bigint }

/** A ballot operation the app itself has in flight (write orchestrator). */
export type PendingOperation = { sequence: bigint; stage: string; txHash?: Hex }

export type ProposalDetailInput = {
  loading: boolean
  loadError: string | null
  detailed: DetailedState | undefined
  record: BallotRecordView | undefined
  standing: VoterStanding
  receipt: BallotReceiptView | undefined
  pending: PendingOperation | null
}

/**
 * The surface map's proposal-detail state machine as one pure projection
 * (execution is the host's separate panel; Canceled is the contract's own
 * terminal state and renders honestly even though the map's fourteen bullets
 * predate it). No renderer may branch on raw chain values past this point.
 */
export type ProposalDetailState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'scheduled'; record: BallotRecordView }
  | { phase: 'open-disconnected'; record: BallotRecordView }
  | { phase: 'open-wrong-network'; record: BallotRecordView; walletChainId: number; expectedChainId: number }
  | { phase: 'open-checking'; record: BallotRecordView }
  | { phase: 'open-ineligible'; record: BallotRecordView; snapshot: number }
  | { phase: 'open-eligible'; record: BallotRecordView; weight: bigint }
  | { phase: 'open-pending'; record: BallotRecordView; pending: PendingOperation }
  | { phase: 'open-recorded'; record: BallotRecordView; receipt: BallotReceiptView; replacementsLeft: number }
  | { phase: 'open-superseded'; record: BallotRecordView; receipt: BallotReceiptView; replacementsLeft: number }
  | { phase: 'closed'; record: BallotRecordView }
  | { phase: 'computing'; record: BallotRecordView }
  | { phase: 'withheld'; record: BallotRecordView }
  | { phase: 'passed'; record: BallotRecordView }
  | { phase: 'rejected'; record: BallotRecordView }
  | { phase: 'canceled'; record: BallotRecordView }

export function proposalDetailState(input: ProposalDetailInput): ProposalDetailState {
  const { detailed, record } = input
  if (input.loadError !== null) return { phase: 'error', message: input.loadError }
  if (input.loading || detailed === undefined || record === undefined) return { phase: 'loading' }
  if (detailed === DetailedState.Uninitialized) {
    return { phase: 'error', message: 'This ballot is not registered on the selected network.' }
  }
  switch (detailed) {
    case DetailedState.Scheduled:
      return { phase: 'scheduled', record }
    case DetailedState.Open:
      return openState(record, input)
    case DetailedState.Closed:
      return { phase: 'closed', record }
    case DetailedState.TallyPending:
      return { phase: 'computing', record }
    case DetailedState.Withheld:
      return { phase: 'withheld', record }
    case DetailedState.Passed:
      return { phase: 'passed', record }
    case DetailedState.Rejected:
      return { phase: 'rejected', record }
    case DetailedState.Canceled:
      return { phase: 'canceled', record }
  }
}

function openState(record: BallotRecordView, input: ProposalDetailInput): ProposalDetailState {
  if (input.pending) return { phase: 'open-pending', record, pending: input.pending }
  const standing = input.standing
  switch (standing.kind) {
    case 'disconnected':
      return { phase: 'open-disconnected', record }
    case 'wrong-network':
      return {
        phase: 'open-wrong-network',
        record,
        walletChainId: standing.walletChainId,
        expectedChainId: standing.expectedChainId,
      }
    case 'checking':
      return { phase: 'open-checking', record }
    case 'ineligible':
      return { phase: 'open-ineligible', record, snapshot: standing.snapshot }
    case 'eligible': {
      const receipt = input.receipt
      if (!receipt?.recorded) return { phase: 'open-eligible', record, weight: standing.weight }
      const replacementsLeft = record.maxReplacements - receipt.replacementsUsed
      const phase = receipt.replacementsUsed > 0 ? 'open-superseded' : 'open-recorded'
      return { phase, record, receipt, replacementsLeft }
    }
  }
}
