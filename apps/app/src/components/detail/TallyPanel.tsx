import type { Hex } from '../../config/addresses.ts'
import { COPY } from '../../lib/copy.ts'
import { formatDateTime, truncateHex } from '../../lib/format.ts'
import { Result } from '../../state/chain.ts'
import type { TallyState } from '../../state/tally.ts'
import type { HostInfo } from '../../hooks/useHost.ts'

/**
 * DEMO-CRITICAL B, read-only slice: every state renders from chain facts.
 * The permissionless request/finalize actions wire in the write batch —
 * until then no dead buttons render.
 */
export function TallyPanel({ state, host }: { state: TallyState; host: HostInfo | undefined }) {
  return (
    <section className="card tally">
      <h2 className="card__title">Tally</h2>
      {body(state, host)}
    </section>
  )
}

function body(state: TallyState, host: HostInfo | undefined) {
  switch (state.phase) {
    case 'loading':
      return <p className="card__body">Resolving tally status…</p>
    case 'disabled': {
      const closes =
        host === undefined
          ? '…'
          : host.timestampClock
            ? formatDateTime(state.opensTallyAt)
            : `block ${state.opensTallyAt.toLocaleString('en-US')}`
      return (
        <p className="card__body">
          The tally cannot start while voting is open. Any wallet may request it after close —{' '}
          <span className="mono">{closes}</span>.
        </p>
      )
    }
    case 'privacy-check':
      return <p className="card__body">Resolving effective Recorded participation…</p>
    case 'floor-failed':
      return (
        <div className="outcome outcome--withheld">
          <p className="outcome__verdict">{COPY.resultWithheld}</p>
          <p className="outcome__body">
            {state.terminal
              ? `Participation stayed below the privacy floor (${state.record.recordedVoters} of ${state.record.privacyFloor}), so no decryption was requested. This outcome is deliberate and final.`
              : `Recorded participation (${state.record.recordedVoters} of ${state.record.privacyFloor}) sits below the privacy floor, so a tally request would withhold the result without touching the encrypted totals.`}
          </p>
        </div>
      )
    case 'ready':
      return (
        <p className="card__body">
          Voting is closed and the privacy floor is met. Any wallet may now request the tally; the
          expected verdict handle is committed before any decryption happens.
        </p>
      )
    case 'submitting':
      return (
        <p className="card__body">
          Tally request submitting…{' '}
          {state.txHash && <span className="mono">{truncateHex(state.txHash, 10, 8)}</span>}
        </p>
      )
    case 'computing':
      return (
        <>
          <p className="card__body">
            The Nox stack is resolving the encrypted verdict. Named stages and measured time only —
            no progress figure is knowable.
          </p>
          <HandleRow handle={state.expectedVerdictHandle} />
        </>
      )
    case 'proof-ready':
      return (
        <>
          <p className="card__body">
            The Gateway&rsquo;s decryption proof is ready for the expected verdict handle.
          </p>
          <HandleRow handle={state.expectedVerdictHandle} />
        </>
      )
    case 'bad-proof':
      return (
        <div className="outcome outcome--withheld">
          <p className="outcome__verdict">Proof rejected</p>
          <p className="outcome__body mono">{state.reason}</p>
        </div>
      )
    case 'timed-out':
      return (
        <p className="card__body">
          No proof arrived inside the polling window. The deterministic request stays valid — polling
          can safely resume.
        </p>
      )
    case 'finalized':
      return <Finalized result={state.result} />
  }
}

function HandleRow({ handle }: { handle: Hex }) {
  return (
    <p className="tally__handle mono">
      Expected verdict handle&ensp;{truncateHex(handle, 12, 10)}
    </p>
  )
}

function Finalized({ result }: { result: Result }) {
  if (result === Result.Passed) {
    return (
      <div className="outcome outcome--passed">
        <p className="outcome__verdict">Passed</p>
        <p className="outcome__body">
          The expected verdict handle publicly decrypted to <span className="mono">true</span>.{' '}
          {COPY.totalsNotDisclosed}.
        </p>
      </div>
    )
  }
  if (result === Result.Withheld) {
    return (
      <div className="outcome outcome--withheld">
        <p className="outcome__verdict">{COPY.resultWithheld}</p>
        <p className="outcome__body">Participation stayed below the privacy floor. {COPY.totalsNotDisclosed}.</p>
      </div>
    )
  }
  return (
    <div className="outcome outcome--neutral">
      <p className="outcome__verdict">{result === Result.Rejected ? 'Rejected' : 'Canceled'}</p>
      <p className="outcome__body">
        {result === Result.Rejected
          ? 'The expected verdict handle publicly decrypted to false. '
          : 'This ballot was canceled before opening. '}
        {COPY.totalsNotDisclosed}.
      </p>
    </div>
  )
}
