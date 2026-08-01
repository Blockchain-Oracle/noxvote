import { BALLOT_STAGES, COPY } from '../../lib/copy.ts'
import { formatElapsed, truncateHex } from '../../lib/format.ts'
import { useElapsed } from '../../hooks/useElapsed.ts'
import type { CastState, CastStage } from '../../write/castVote.ts'

const STAGE_INDEX: Record<CastStage | 'recorded', number> = {
  preparing: 0,
  wallet: 1,
  submitting: 2,
  computing: 3,
  recorded: 4,
}

const STAGE_NOTE: Record<CastStage, string> = {
  preparing: COPY.gatewayPreparation,
  wallet: 'The operation is assembled and waiting for your signature.',
  submitting: 'The transaction is going on-chain. Your wallet and the time are now public.',
  computing:
    'The Nox stack folds the operation into the sealed totals. No progress figure is shown, because none is knowable.',
}

/**
 * Screen 9. Five named stages bound to the cast machine's real awaitables,
 * measured elapsed time, per-stage failure with resume-safe retry. Closing
 * the overlay does not change the operation.
 */
export function ProgressOverlay({
  cast,
  startedAt,
  open,
  onClose,
  onRetry,
}: {
  cast: CastState
  startedAt: number | null
  open: boolean
  onClose: () => void
  onRetry: () => void
}) {
  const elapsed = useElapsed(open && cast.stage !== 'recorded' ? startedAt : null)
  if (!open || cast.stage === 'idle') return null

  const failed = cast.stage === 'failed' ? cast : null
  const running = cast.stage !== 'failed' && cast.stage !== 'recorded' ? cast.stage : null
  const activeIndex = failed ? STAGE_INDEX[failed.at] : STAGE_INDEX[running ?? 'recorded']

  return (
    <div className="overlay" role="presentation">
      <div className="overlay__panel" role="dialog" aria-modal="true" aria-label="Ballot progress">
        <p className="card__title">Ballot operation</p>
        <ol className="overlay__stages">
          {BALLOT_STAGES.map((name, index) => {
            const cls =
              failed && index === activeIndex
                ? 'is-failed'
                : index < activeIndex || cast.stage === 'recorded'
                  ? 'is-done'
                  : index === activeIndex
                    ? 'is-active'
                    : undefined
            return (
              <li key={name} className={cls}>
                <span className="overlay__stage-name">{name}</span>
                {running && index === activeIndex && (
                  <span className="overlay__stage-note">{STAGE_NOTE[running]}</span>
                )}
                {failed && index === activeIndex && (
                  <span className="overlay__stage-note overlay__stage-note--failed">
                    {failed.message}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
        {'txHash' in cast && cast.txHash && (
          <p className="overlay__tx mono">tx {truncateHex(cast.txHash, 10, 8)}</p>
        )}
        {cast.stage === 'recorded' ? (
          <p className="overlay__done">
            {COPY.ballotRecorded}. Sequence {cast.sequence.toString()}.{' '}
            <span className="overlay__limit">{COPY.receiptLimit}.</span>
          </p>
        ) : (
          elapsed !== null && <p className="overlay__elapsed mono">Elapsed {formatElapsed(elapsed)}</p>
        )}
        <div className="drawer__actions">
          {failed && (
            <button type="button" className="state-card__action" onClick={onRetry}>
              Retry this stage
            </button>
          )}
          <button type="button" className="drawer__close" onClick={onClose}>
            Close
          </button>
        </div>
        {cast.stage !== 'recorded' && (
          <p className="overlay__note">
            Closing this overlay does not change the operation. A delayed operation stays pending —
            it is never shown as recorded early.
          </p>
        )}
      </div>
    </div>
  )
}
