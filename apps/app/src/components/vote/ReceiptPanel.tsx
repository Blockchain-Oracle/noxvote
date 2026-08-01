import type { Hex } from '../../config/addresses.ts'
import { COPY } from '../../lib/copy.ts'
import { truncateHex } from '../../lib/format.ts'
import type { OperationReceiptState } from '../../state/receipt.ts'

const SUCCESSFUL: Array<OperationReceiptState['phase']> = [
  'submitted',
  'computing',
  'effective',
  'superseded',
]

/**
 * Screen 10. The public record of the newest operation: status, sequence,
 * transaction — and in every successful state, the receipt's honest limit.
 */
export function ReceiptPanel({
  state,
  ballotId,
  wallet,
}: {
  state: OperationReceiptState
  ballotId: Hex
  wallet: Hex | undefined
}) {
  if (state.phase === 'none') return null
  return (
    <section className="card receipt">
      <h2 className="card__title">Operation receipt</h2>
      {body(state)}
      <dl className="rules">
        <div className="rules__row">
          <dt>Proposal</dt>
          <dd className="mono">{truncateHex(ballotId, 10, 6)}</dd>
        </div>
        {wallet && (
          <div className="rules__row">
            <dt>Wallet</dt>
            <dd className="mono">{truncateHex(wallet)}</dd>
          </div>
        )}
        {'sequence' in state && (
          <div className="rules__row">
            <dt>Sequence</dt>
            <dd className="mono">{state.sequence.toString()}</dd>
          </div>
        )}
        {'txHash' in state && state.txHash && (
          <div className="rules__row">
            <dt>Transaction</dt>
            <dd className="mono">{truncateHex(state.txHash, 10, 8)}</dd>
          </div>
        )}
      </dl>
      {SUCCESSFUL.includes(state.phase) && <p className="card__note">{COPY.receiptLimit}.</p>}
    </section>
  )
}

function body(state: OperationReceiptState) {
  switch (state.phase) {
    case 'submitted':
      return <p className="card__body">Submitted — waiting for the transaction to be included.</p>
    case 'computing':
      return (
        <p className="card__body">
          Included — confirming the recorded operation against the chain&rsquo;s own receipt.
        </p>
      )
    case 'effective':
      return (
        <p className="card__body">
          Recorded — Effective.
          {state.supersedes !== null && (
            <> Supersedes sequence <span className="mono">{state.supersedes.toString()}</span>.</>
          )}
        </p>
      )
    case 'superseded':
      return (
        <p className="card__body">
          Recorded — Superseded by sequence{' '}
          <span className="mono">{state.newestSequence.toString()}</span>. The newest recorded
          operation counts.
        </p>
      )
    case 'rejected':
      return <p className="card__body receipt__bad">Rejected: {state.reason}</p>
    case 'timed-out':
      return (
        <p className="card__body">
          No confirmation inside the waiting window. The operation may still be included — retry
          resumes watching the same transaction.
        </p>
      )
    case 'stale':
      return <p className="card__body receipt__bad">Stale sequence: {state.reason}</p>
    case 'none':
      return null
  }
}
