import { Pill } from '@noxvote/ui'
import type { Hex } from '../../config/addresses.ts'
import { formatDateTime, formatRemaining, formatWeight } from '../../lib/format.ts'
import { CopyHash, ExplorerLink } from '../Hashes.tsx'
import type { CommittedAction, ExecutionState } from '../../state/execution.ts'

type StepState = 'done' | 'active' | 'pending'
type Step = { label: string; state: StepState }

/**
 * Screen 14. The committed action's journey to on-chain finality: a phase
 * track (Committed → Queued → Executed) above the state body. The decoded
 * bundle executes exactly once; nothing here is editable.
 */
export function ExecutionPanel({
  state,
  queueStep = false,
  onQueue,
  onExecute,
}: {
  state: ExecutionState | { phase: 'loading' }
  /** The host runs a timelock, so a Queued step exists between commit and execute. */
  queueStep?: boolean
  onQueue?: () => void
  onExecute?: () => void
}) {
  if (state.phase === 'unavailable' || state.phase === 'loading') return null
  return (
    <section className="card">
      <h2 className="card__title">Execution</h2>
      <Track steps={trackSteps(state, queueStep)} />
      {body(state, onQueue, onExecute)}
    </section>
  )
}

function trackSteps(state: ExecutionState, queueStep: boolean): Step[] {
  const steps: Step[] = [{ label: 'Committed', state: 'done' }]
  const readyToQueue = state.phase === 'ready' && state.queue
  if (queueStep) steps.push({ label: 'Queued', state: readyToQueue ? 'active' : 'done' })
  const executed: StepState =
    state.phase === 'executed' ? 'done' : readyToQueue ? 'pending' : 'active'
  steps.push({ label: 'Executed', state: executed })
  return steps
}

function Track({ steps }: { steps: Step[] }) {
  return (
    <ol className="exec-track">
      {steps.map((step, i) => (
        <li
          key={step.label}
          className={[
            'exec-step',
            `exec-step--${step.state}`,
            i > 0 && steps[i - 1].state === 'done' ? 'exec-step--linked' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="exec-step__node">{step.state === 'done' ? <CheckIcon /> : null}</span>
          <span className="exec-step__label">{step.label}</span>
        </li>
      ))}
    </ol>
  )
}

function body(state: ExecutionState, onQueue?: () => void, onExecute?: () => void) {
  switch (state.phase) {
    case 'unavailable':
      return null
    case 'waiting-timelock':
      return (
        <div className="exec-wait">
          <span className="exec-wait__dot" aria-hidden="true">
            <i />
          </span>
          <p className="exec-wait__body">
            Queued through the timelock. Execution opens{' '}
            <span className="mono">{formatDateTime(state.eta)}</span> —{' '}
            <span className="mono exec-wait__eta">
              {formatRemaining(state.eta * 1000 - Date.now())}
            </span>
            .
          </p>
        </div>
      )
    case 'ready':
      return (
        <>
          {state.actions ? (
            <p className="exec-ready__body">
              The sealed action is ready. Execution is permissionless — anyone can submit the
              committed bundle, and the host verifies it against the commitment.
            </p>
          ) : (
            <p className="exec-ready__body">
              Execution is permissionless, but this app holds no copy of the committed bundle — the
              executor supplies it and the host verifies it against the commitment below.
            </p>
          )}
          <Actions actions={state.actions} actionHash={state.actionHash} />
          {state.actions && (
            <Pill
              onClick={state.queue ? onQueue : onExecute}
              className="voter__action"
              disabled={state.queue ? !onQueue : !onExecute}
            >
              {state.queue ? 'Queue through timelock' : 'Execute committed action'}
            </Pill>
          )}
        </>
      )
    case 'submitting':
      return (
        <div className="exec-wait">
          <span className="exec-wait__dot" aria-hidden="true">
            <i />
          </span>
          <p className="exec-wait__body">Submitting…</p>
        </div>
      )
    case 'executed':
      return (
        <>
          <div className="exec-done">
            <span className="exec-done__glyph" aria-hidden="true">
              <SealCheck />
            </span>
            <div className="exec-done__text">
              <p className="exec-done__title">Executed on-chain</p>
              <p className="exec-done__sub">
                The committed action ran exactly once, against the sealed commitment.
              </p>
            </div>
          </div>
          {(state.txHash || state.executor) && (
            <dl className="exec-receipt">
              {state.txHash && (
                <div>
                  <dt>Transaction</dt>
                  <dd>
                    <ExplorerLink kind="tx" value={state.txHash} />
                  </dd>
                </div>
              )}
              {state.executor && (
                <div>
                  <dt>Executor</dt>
                  <dd>
                    <ExplorerLink kind="address" value={state.executor} />
                  </dd>
                </div>
              )}
            </dl>
          )}
        </>
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
    <div className="exec-action">
      <div className="exec-action__row">
        <span className="exec-action__lead">Commitment</span>
        <CopyHash value={actionHash} />
      </div>
      {actions?.map((action, i) => (
        <div className="exec-action__row" key={`${action.to}-${i}`}>
          <span className="exec-action__lead">Action {i + 1}</span>
          <span className="exec-action__detail">
            call <ExplorerLink kind="address" value={action.to} /> · value{' '}
            {formatWeight(action.value)} wei · data{' '}
            {action.data === '0x' ? 'none' : <CopyHash value={action.data} tail={6} />}
          </span>
        </div>
      ))}
    </div>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12.5l3.5 3.5 8-9" />
    </svg>
  )
}

function SealCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10.4" strokeWidth="1.4" />
      <path d="M7.4 12.4l3 3 6.2-6.6" />
    </svg>
  )
}
