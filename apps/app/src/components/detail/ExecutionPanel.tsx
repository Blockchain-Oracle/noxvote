import { Pill } from '@noxvote/ui'
import type { Hex } from '../../config/addresses.ts'
import { formatDateTime, formatWeight, truncateHex } from '../../lib/format.ts'
import type { CommittedAction, ExecutionState } from '../../state/execution.ts'

/**
 * Screen 14. The decoded committed action executes exactly once; nothing here
 * is editable — the bundle was committed before voting opened.
 */
export function ExecutionPanel({
  state,
  onQueue,
  onExecute,
}: {
  state: ExecutionState | { phase: 'loading' }
  onQueue?: () => void
  onExecute?: () => void
}) {
  if (state.phase === 'unavailable' || state.phase === 'loading') return null
  return (
    <section className="card">
      <h2 className="card__title">Execution</h2>
      {body(state, onQueue, onExecute)}
    </section>
  )
}

function body(state: ExecutionState, onQueue?: () => void, onExecute?: () => void) {
  switch (state.phase) {
    case 'unavailable':
      return null
    case 'waiting-timelock':
      return (
        <p className="card__body">
          Queued through the timelock. Execution opens{' '}
          <span className="mono">{formatDateTime(state.eta)}</span>.
        </p>
      )
    case 'ready':
      return (
        <>
          <Actions actions={state.actions} actionHash={state.actionHash} />
          {state.actions ? (
            <Pill
              onClick={state.queue ? onQueue : onExecute}
              className="voter__action"
              disabled={state.queue ? !onQueue : !onExecute}
            >
              {state.queue ? 'Queue through timelock' : 'Execute committed action'}
            </Pill>
          ) : (
            <p className="card__note">
              Execution is permissionless, but this app holds no copy of the committed bundle — the
              executor supplies it and the host verifies it against the commitment above.
            </p>
          )}
        </>
      )
    case 'submitting':
      return <p className="card__body">Submitting…</p>
    case 'executed':
      return (
        <p className="card__body">
          Executed once.
          {state.executor && (
            <> Executor <span className="mono">{truncateHex(state.executor)}</span>.</>
          )}
          {state.txHash && (
            <> Transaction <span className="mono">{truncateHex(state.txHash, 10, 8)}</span>.</>
          )}
        </p>
      )
    case 'failed':
      return (
        <p className="card__body receipt__bad">
          Execution failed: {state.reason}. The committed action is unchanged and can be retried
          exactly.
        </p>
      )
    case 'mismatch':
      return (
        <div className="outcome outcome--danger">
          <p className="outcome__verdict">Action mismatch</p>
          <p className="outcome__body">
            The supplied bundle does not match the on-chain commitment. {state.detail}
          </p>
        </div>
      )
  }
}

function Actions({ actions, actionHash }: { actions: CommittedAction[] | null; actionHash: Hex }) {
  return (
    <dl className="rules">
      <div className="rules__row">
        <dt>Commitment</dt>
        <dd className="mono">{truncateHex(actionHash, 10, 8)}</dd>
      </div>
      {actions?.map((action, i) => (
        <div className="rules__row" key={`${action.to}-${i}`}>
          <dt>Action {i + 1}</dt>
          <dd className="mono">
            call {truncateHex(action.to)} · value {formatWeight(action.value)} wei · data{' '}
            {action.data === '0x' ? 'none' : truncateHex(action.data, 10, 6)}
          </dd>
        </div>
      ))}
    </dl>
  )
}
