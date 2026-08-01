import { Pill } from '@noxvote/ui'
import type { Hex } from '../../config/addresses.ts'
import { useElapsed } from '../../hooks/useElapsed.ts'
import type { HostInfo } from '../../hooks/useHost.ts'
import { formatElapsed } from '../../lib/format.ts'
import type { BallotRecordView, DetailedState, Result } from '../../state/chain.ts'
import { tallyState } from '../../state/tally.ts'
import { useFinalize, useRequestTally, useVerdictProof } from '../../write/finalizeTally.ts'
import { TallyPanel } from './TallyPanel.tsx'

/**
 * Owns the tally writes (permissionless request → Gateway proof poll →
 * finalize) and feeds their real progress into the ten-state projection.
 */
export function TallyFlow({
  core,
  ballotId,
  record,
  detailed,
  result,
  expectedVerdictHandle,
  loading,
  host,
}: {
  core: Hex
  ballotId: Hex
  record: BallotRecordView | undefined
  detailed: DetailedState | undefined
  result: Result | undefined
  expectedVerdictHandle: Hex | undefined
  loading: boolean
  host: HostInfo | undefined
}) {
  const request = useRequestTally(core, ballotId)
  const state = tallyState({
    loading,
    detailed,
    record,
    expectedVerdictHandle,
    result,
    request: request.progress,
    proof: { status: 'idle' },
    finalize: { status: 'idle' },
  })
  // The proof poll runs only while the chain says TallyPending.
  const polling = state.phase === 'computing' || state.phase === 'proof-ready' || state.phase === 'timed-out'
  const proof = useVerdictProof(expectedVerdictHandle, polling)
  const finalize = useFinalize(core, ballotId)
  const finalState = tallyState({
    loading,
    detailed,
    record,
    expectedVerdictHandle,
    result,
    request: request.progress,
    proof: proof.progress,
    finalize: finalize.progress,
  })
  const elapsed = useElapsed(
    proof.progress.status === 'polling' ? proof.progress.startedAt : null,
  )

  return (
    <TallyPanel
      state={finalState}
      host={host}
      action={action(finalState.phase)}
      elapsed={elapsed !== null ? formatElapsed(elapsed) : undefined}
    />
  )

  function action(phase: string) {
    if (phase === 'ready') {
      return (
        <Pill onClick={request.request} className="voter__action">
          Request tally
        </Pill>
      )
    }
    if (phase === 'proof-ready' && proof.progress.status === 'ready') {
      const decryptionProof = proof.progress.decryptionProof
      return (
        <Pill onClick={() => finalize.finalize(decryptionProof)} className="voter__action">
          Finalize verdict
        </Pill>
      )
    }
    if (phase === 'timed-out') {
      return (
        <button type="button" className="state-card__action" onClick={proof.retryAfterTimeout}>
          Resume polling
        </button>
      )
    }
    return null
  }
}
