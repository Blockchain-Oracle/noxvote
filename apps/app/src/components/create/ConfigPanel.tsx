import { Pill } from '@noxvote/ui'
import type { GovernorSettings } from '../../hooks/useGovernorSettings.ts'
import { formatWeight } from '../../lib/format.ts'
import type { FieldErrors, ProposalDraft } from '../../state/proposalForm.ts'

/**
 * Screen 5: the confidential configuration. Only the privacy floor is
 * author-set here — snapshot timing, replacement ceiling, quorum, and the
 * fixed choices are the Governor's immutable settings, shown read-only so the
 * author sees the exact rules before publishing.
 */
export function ConfigPanel({
  draft,
  errors,
  quorumEqualsFloor,
  settings,
  onChange,
  onBack,
  onNext,
  canContinue,
}: {
  draft: ProposalDraft
  errors: FieldErrors
  quorumEqualsFloor: boolean
  settings: GovernorSettings | undefined
  onChange: (patch: Partial<ProposalDraft>) => void
  onBack: () => void
  onNext: () => void
  canContinue: boolean
}) {
  return (
    <section className="card">
      <h2 className="card__title">Confidential configuration</h2>

      <label className="create__field">
        <span className="create__label">Privacy floor — minimum unique wallets before any reveal</span>
        <input
          className="create__input mono"
          inputMode="numeric"
          value={draft.privacyFloor}
          onChange={(e) => onChange({ privacyFloor: e.target.value })}
          placeholder="e.g. 4"
        />
        {errors.privacyFloor && <span className="create__error">{errors.privacyFloor}</span>}
      </label>
      {quorumEqualsFloor && (
        <p className="card__note create__semantic">
          Your privacy floor equals the governance quorum by coincidence. They are different rules:
          the privacy floor decides when a result may be revealed; the quorum decides whether the
          vote counts. Both must be met, independently.
        </p>
      )}

      <dl className="rules create__fixed">
        <Row label="Choices" value="For / Against / Abstain (fixed)" />
        <Row
          label="Weight snapshot"
          value={settings ? `at proposal start · ${settings.clockMode}` : 'Resolving…'}
        />
        <Row
          label="Voting delay / period"
          value={
            settings
              ? `${settings.votingDelay.toString()} → ${settings.votingPeriod.toString()} (host units)`
              : 'Resolving…'
          }
        />
        <Row
          label="Replacements"
          value={settings ? `Up to ${settings.maxReplacements}; latest accepted counts` : 'Resolving…'}
        />
        <Row
          label="Proposal threshold"
          value={settings ? `${formatWeight(settings.proposalThreshold)} voting weight to publish` : 'Resolving…'}
        />
      </dl>
      <p className="card__note">
        These rules are fixed by the Governor at deployment — they cannot be edited per proposal.
      </p>

      <div className="drawer__actions">
        <Pill onClick={onNext} disabled={!canContinue} className="voter__action" arrow>
          Review and publish
        </Pill>
        <button type="button" className="drawer__close" onClick={onBack}>
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
