import checkpoint from '../../../../deployments/sepolia/phase6-live.json'
import { profile, type Hex } from '../config/addresses.ts'
import { DetailedState, type BallotRecordView } from '../state/chain.ts'
import { LIFECYCLE_LABELS } from './copy.ts'
import { formatDateTime, formatRemaining } from './format.ts'

/** Chip treatment: the state triad stays confined to its three states; every
 * other lifecycle label renders the neutral chip (DESIGN accent-scarcity law). */
export type ChipTone = 'recorded' | 'withheld' | 'passed' | 'neutral'

export function lifecycleLabel(state: DetailedState): { label: string; tone: ChipTone } {
  switch (state) {
    case DetailedState.Uninitialized:
      return { label: LIFECYCLE_LABELS.unknown, tone: 'neutral' }
    case DetailedState.Scheduled:
      return { label: LIFECYCLE_LABELS.scheduled, tone: 'neutral' }
    case DetailedState.Open:
      return { label: LIFECYCLE_LABELS.open, tone: 'neutral' }
    case DetailedState.Closed:
      return { label: LIFECYCLE_LABELS.closed, tone: 'neutral' }
    case DetailedState.TallyPending:
      return { label: LIFECYCLE_LABELS.computing, tone: 'neutral' }
    case DetailedState.Withheld:
      return { label: LIFECYCLE_LABELS.withheld, tone: 'withheld' }
    case DetailedState.Rejected:
      return { label: LIFECYCLE_LABELS.rejected, tone: 'neutral' }
    case DetailedState.Passed:
      return { label: LIFECYCLE_LABELS.passed, tone: 'passed' }
    case DetailedState.Canceled:
      return { label: LIFECYCLE_LABELS.canceled, tone: 'neutral' }
  }
}

/**
 * On-screen title. The Governor's live ballot carries its real propose-call
 * description (recorded in the Phase 6 checkpoint); everything else renders
 * the neutral product name for a ballot — titles are not an on-chain fact.
 */
export function ballotTitle(ballotId: Hex): string {
  if (profile.kind === 'sepolia' && ballotId === profile.proofs.governor.ballotId) {
    return checkpoint.governorProof.description
  }
  return 'Confidential proposal'
}

/**
 * The card's one state-aware timing line. Never invents a clock: dates render
 * only when the host counts in time (`timestampClock`); block-mode hosts show a
 * block label instead of a fabricated date. Execution is carried by the card's
 * "Executed on-chain" tag, not here — this line stays about the vote window.
 */
export function ballotTiming(
  state: DetailedState | undefined,
  record: BallotRecordView | undefined,
  timestampClock: boolean | undefined,
): { text: string; live: boolean } | null {
  if (state === undefined || record === undefined) return null
  const at = (v: number) =>
    timestampClock ? formatDateTime(v) : `block ${v.toLocaleString('en-US')}`
  switch (state) {
    case DetailedState.Scheduled:
      return { text: `Opens · ${at(record.voteStart)}`, live: false }
    case DetailedState.Open:
      return timestampClock
        ? { text: formatRemaining((record.voteEnd - Date.now() / 1000) * 1000), live: true }
        : { text: 'Voting open', live: true }
    default:
      return { text: `Closed · ${at(record.voteEnd)}`, live: false }
  }
}
