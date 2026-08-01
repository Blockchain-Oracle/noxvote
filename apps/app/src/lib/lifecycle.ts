import checkpoint from '../../../../deployments/sepolia/phase6-live.json'
import { profile, type Hex } from '../config/addresses.ts'
import { DetailedState } from '../state/chain.ts'
import { LIFECYCLE_LABELS } from './copy.ts'

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
