import { useEffect } from 'react'
import { Link } from 'react-router'
import { profile, type Hex } from '../config/addresses.ts'
import { activeChain } from '../config/chains.ts'
import { truncateHex } from '../lib/format.ts'
import { TRUST_SECTIONS } from '../lib/trust.ts'

/**
 * Screen 16: one overlay, five stable sections, reachable wherever trust is
 * decided. The sections never reorder and never vary by state — stability is
 * the point.
 */
export function GuaranteeOverlay({
  open,
  onClose,
  verifyPath,
  core,
}: {
  open: boolean
  onClose: () => void
  /** Link target for this proposal's verification center, when in context. */
  verifyPath?: string
  core?: Hex
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div
        className="overlay__panel guarantee"
        role="dialog"
        aria-modal="true"
        aria-label="What is guaranteed"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="card__title">What is guaranteed — and what is not</p>
        {TRUST_SECTIONS.map((section) => (
          <section key={section.title} className="guarantee__section">
            <h3 className="guarantee__title">{section.title}</h3>
            <p className="guarantee__body">{section.body}</p>
          </section>
        ))}
        <dl className="rules">
          <div className="rules__row">
            <dt>Network</dt>
            <dd className="mono">
              {activeChain.name} ({activeChain.id})
            </dd>
          </div>
          {core && (
            <div className="rules__row">
              <dt>Ballot core</dt>
              <dd className="mono">{truncateHex(core, 10, 6)}</dd>
            </div>
          )}
          {profile.kind !== 'unconfigured' && (
            <div className="rules__row">
              <dt>Gateway signer</dt>
              <dd className="mono">{truncateHex(profile.nox.gatewaySigner)}</dd>
            </div>
          )}
        </dl>
        <div className="drawer__actions">
          {verifyPath && (
            <Link to={verifyPath} className="detail__verify" onClick={onClose}>
              Open the verification center
            </Link>
          )}
          <button type="button" className="drawer__close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
