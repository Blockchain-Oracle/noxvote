import { Pill } from '@noxvote/ui'
import { COPY } from '../../lib/copy.ts'
import { formatDateTime } from '../../lib/format.ts'
import type { VoteDrawerState } from '../../state/voteDrawer.ts'

export type ChangeVoteState =
  | { phase: 'allowed'; deadline: number; timestampClock: boolean; replacementsLeft: number }
  | { phase: 'pending-previous' }
  | { phase: 'too-late' }
  | { phase: 'ceiling'; maxReplacements: number }

/** Screen 11's availability, projected from the drawer machine plus the
 * local operation-in-flight flag. Wrong-sequence races and the recorded
 * confirmation are owned by the cast machine and receipt states. */
export function changeVoteState(
  drawer: VoteDrawerState,
  castBusy: boolean,
  deadline: number,
  timestampClock: boolean,
): ChangeVoteState {
  if (castBusy) return { phase: 'pending-previous' }
  if (drawer.phase === 'ceiling') return { phase: 'ceiling', maxReplacements: drawer.maxReplacements }
  if (drawer.phase === 'ready' && drawer.replacement) {
    return { phase: 'allowed', deadline, timestampClock, replacementsLeft: drawer.replacementsLeft }
  }
  return { phase: 'too-late' }
}

/** The confirmation interstitial: the coercion-recovery warning is read
 * before the drawer ever opens for a replacement. */
export function ChangeVoteConfirm({
  state,
  open,
  onClose,
  onContinue,
}: {
  state: ChangeVoteState
  open: boolean
  onClose: () => void
  onContinue: () => void
}) {
  if (!open) return null
  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div
        className="overlay__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Change vote"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="card__title">Change vote</p>
        {body(state)}
        <div className="drawer__actions">
          {state.phase === 'allowed' && (
            <Pill onClick={onContinue}>Continue to new choice</Pill>
          )}
          <button type="button" className="drawer__close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function body(state: ChangeVoteState) {
  switch (state.phase) {
    case 'allowed':
      return (
        <>
          <p className="card__body">{COPY.replacementWarning}</p>
          <dl className="rules">
            <div className="rules__row">
              <dt>Rule</dt>
              <dd className="mono">Newest recorded operation counts</dd>
            </div>
            <div className="rules__row">
              <dt>Deadline</dt>
              <dd className="mono">
                {state.timestampClock
                  ? formatDateTime(state.deadline)
                  : `block ${state.deadline.toLocaleString('en-US')}`}
              </dd>
            </div>
            <div className="rules__row">
              <dt>Replacements left</dt>
              <dd className="mono">{state.replacementsLeft}</dd>
            </div>
          </dl>
        </>
      )
    case 'pending-previous':
      return (
        <p className="card__body">
          Your previous operation is still in flight. Operations are processed in strict sequence —
          wait for it to record before replacing it.
        </p>
      )
    case 'too-late':
      return <p className="card__body">Voting is closed; the newest recorded operation stands.</p>
    case 'ceiling':
      return (
        <p className="card__body">
          All {state.maxReplacements} replacements are used. The newest recorded operation stands.
        </p>
      )
  }
}
