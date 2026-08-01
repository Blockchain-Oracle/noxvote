import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Pill } from '@noxvote/ui'
import { COPY } from '../../lib/copy.ts'
import { formatWeight, truncateHex } from '../../lib/format.ts'
import type { ProposalDraft } from '../../state/proposalForm.ts'
import type { PublishProgress } from '../../write/propose.ts'

/**
 * Screen 6: decoded action review, immutable commitments, and the trust
 * acknowledgement gate. Publication is disabled until the author checks the
 * acknowledgement. An unrecognized calldata is warned, never hidden.
 */
export function PublishReview({
  draft,
  canPublish,
  progress,
  onBack,
  onPublish,
  onPublished,
}: {
  draft: ProposalDraft
  canPublish: boolean
  progress: PublishProgress
  onBack: () => void
  onPublish: () => void
  onPublished: () => void
}) {
  const [acknowledged, setAcknowledged] = useState(false)
  const recognized = draft.calldata === '0x' || draft.calldata.length >= 10
  const busy = progress.status === 'publishing'
  const published = progress.status === 'published'

  useEffect(() => {
    if (published) onPublished()
  }, [published, onPublished])

  if (progress.status === 'published') {
    return (
      <section className="card">
        <h2 className="card__title">Published</h2>
        <p className="card__body">
          The confidential proposal is registered on-chain. Voting opens after the Governor&rsquo;s
          delay.
        </p>
        <dl className="rules">
          <Row label="Proposal id" value={truncateHex(`0x${progress.proposalId.toString(16)}`, 10, 6)} />
          <Row label="Transaction" value={truncateHex(progress.txHash, 10, 8)} />
        </dl>
        <p className="voter__action">
          <Link className="detail__verify" to="/">
            View it in the proposal list
          </Link>
        </p>
      </section>
    )
  }

  return (
    <section className="card">
      <h2 className="card__title">Review and publish</h2>
      <dl className="rules">
        <Row label="Description" value={draft.description || '—'} />
        <Row label="Action target" value={truncateHex(draft.target, 10, 6)} />
        <Row label="Value" value={`${formatWeight(BigInt(draft.value || '0'))} wei`} />
        <Row label="Calldata" value={draft.calldata === '0x' ? 'none' : truncateHex(draft.calldata, 10, 6)} />
        <Row label="Privacy floor" value={draft.privacyFloor} />
      </dl>
      {!recognized && (
        <p className="card__note create__warn">
          The calldata is too short to decode a function selector. Publish only if you are certain
          this raw call is what you intend.
        </p>
      )}
      <p className="card__note">
        Once published, the action commitment, privacy floor, and snapshot are immutable — they
        cannot be changed after voting opens. {COPY.totalsNotDisclosed}.
      </p>

      <label className="create__ack">
        <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
        <span>{COPY.trustAcknowledgement}</span>
      </label>

      {(progress.status === 'rejected' || progress.status === 'failed') && (
        <p className="card__body receipt__bad">{progress.reason}</p>
      )}

      <div className="drawer__actions">
        <Pill onClick={onPublish} disabled={!acknowledged || busy || !canPublish} className="voter__action">
          {busy ? 'Publishing…' : 'Publish confidential proposal'}
        </Pill>
        <button type="button" className="drawer__close" onClick={onBack} disabled={busy}>
          Back
        </button>
      </div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rules__row">
      <dt>{label}</dt>
      <dd className="mono">{value}</dd>
    </div>
  )
}
