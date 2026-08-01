import { useState } from 'react'
import { Pill } from '@noxvote/ui'
import type { ProposalDraft, FieldErrors } from '../../state/proposalForm.ts'
import { AbiActionBuilder } from './AbiActionBuilder.tsx'

/**
 * Screen 4: the native proposal fields with the confidential control locked
 * on — a NoxVote Governor disables every plaintext cast route, so confidential
 * outcome is mandatory by policy, not a toggle. The guarantee preview sits
 * beside it.
 */
export function ProposalEditor({
  draft,
  errors,
  restored,
  onChange,
  onNext,
}: {
  draft: ProposalDraft
  errors: FieldErrors
  restored: boolean
  onChange: (patch: Partial<ProposalDraft>) => void
  onNext: () => void
}) {
  const [mode, setMode] = useState<'abi' | 'paste'>(
    draft.calldata && draft.calldata !== '0x' ? 'paste' : 'abi',
  )
  return (
    <section className="card">
      <h2 className="card__title">Proposal</h2>
      {restored && (
        <p className="card__note create__restored">Restored from your last unpublished draft.</p>
      )}
      <div className="create__mandatory">
        <span className="chip chip--plain">Confidential outcome · mandatory</span>
        <p className="card__body">
          This Governor runs confidential outcomes only. Individual choices and exact totals stay
          private; only the verdict is published, and only once the privacy floor is met.
        </p>
      </div>
      <Field label="Description" error={errors.description}>
        <textarea
          className="create__input"
          rows={3}
          value={draft.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What this proposal does, in public."
        />
      </Field>
      <Field label="Action target" error={errors.target}>
        <input
          className="create__input mono"
          value={draft.target}
          onChange={(e) => onChange({ target: e.target.value })}
          placeholder="0x…"
        />
      </Field>
      <div className="abi-mode" role="tablist" aria-label="How to specify the call">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'abi'}
          className={`abi-mode__tab${mode === 'abi' ? ' is-active' : ''}`}
          onClick={() => setMode('abi')}
        >
          Build from ABI
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'paste'}
          className={`abi-mode__tab${mode === 'paste' ? ' is-active' : ''}`}
          onClick={() => setMode('paste')}
        >
          Paste calldata
        </button>
      </div>
      {mode === 'abi' ? (
        <AbiActionBuilder target={draft.target} value={draft.value} onChange={onChange} />
      ) : (
        <div className="create__row">
          <Field label="Value (wei)" error={errors.value}>
            <input
              className="create__input mono"
              value={draft.value}
              onChange={(e) => onChange({ value: e.target.value })}
            />
          </Field>
          <Field label="Calldata" error={errors.calldata}>
            <input
              className="create__input mono"
              value={draft.calldata}
              onChange={(e) => onChange({ calldata: e.target.value })}
              placeholder="0x"
            />
          </Field>
        </div>
      )}
      <Pill onClick={onNext} className="voter__action" arrow>
        Configure
      </Pill>
    </section>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="create__field">
      <span className="create__label">{label}</span>
      {children}
      {error && <span className="create__error">{error}</span>}
    </label>
  )
}
