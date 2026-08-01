import { useEffect, useRef, useState } from 'react'
import { Pill } from '@noxvote/ui'
import { COPY } from '../../lib/copy.ts'
import { formatWeight } from '../../lib/format.ts'
import { CHOICE, type ChoiceName } from '../../write/castVote.ts'
import type { VoteDrawerState } from '../../state/voteDrawer.ts'

const OPTIONS: Array<{ name: ChoiceName; label: string }> = [
  { name: 'for', label: 'For' },
  { name: 'against', label: 'Against' },
  { name: 'abstain', label: 'Abstain' },
]

/**
 * Screen 8. Three equal options, nothing preselected, no free-text reason —
 * ever (free text can disclose the vote). The confirm action hands the
 * canonical encrypted value to the cast machine and closes.
 */
export function VoteDrawer({
  state,
  open,
  onClose,
  onConfirm,
}: {
  state: VoteDrawerState
  open: boolean
  onClose: () => void
  onConfirm: (choice: bigint) => void
}) {
  const [chosen, setChosen] = useState<ChoiceName | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) setChosen(null)
  }, [open])
  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab') {
        // Keep focus inside the sheet while it is modal.
        const panel = panelRef.current
        if (!panel) return
        const focusable = panel.querySelectorAll<HTMLElement>('button, a[href], [tabindex="0"]')
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="drawer" role="presentation" onClick={onClose}>
      <div
        className="drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Cast confidential vote"
        tabIndex={-1}
        ref={panelRef}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="card__title">
          {state.phase === 'ready' && state.replacement ? 'Change vote' : 'Cast confidential vote'}
        </p>
        {body(state, chosen, setChosen)}
        <div className="drawer__actions">
          {state.phase === 'ready' && (
            <Pill
              onClick={() => chosen !== null && onConfirm(CHOICE[chosen])}
              disabled={chosen === null}
            >
              Submit confidential vote
            </Pill>
          )}
          <button type="button" className="drawer__close" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="drawer__promise">{COPY.promise}</p>
      </div>
    </div>
  )
}

function body(
  state: VoteDrawerState,
  chosen: ChoiceName | null,
  setChosen: (c: ChoiceName) => void,
) {
  switch (state.phase) {
    case 'disconnected':
      return <p className="card__body">Connect a wallet on the proposal page first.</p>
    case 'wrong-network':
      return <p className="card__body">Switch your wallet to the ballot&rsquo;s network first.</p>
    case 'checking':
      return <p className="card__body">Checking eligibility at the snapshot…</p>
    case 'ineligible':
      return (
        <p className="card__body">
          This wallet holds no voting weight at snapshot{' '}
          <span className="mono">{state.snapshot.toLocaleString('en-US')}</span>, so it cannot cast
          on this ballot.
        </p>
      )
    case 'not-open':
      return <p className="card__body">Voting is not open on this ballot.</p>
    case 'ceiling':
      return (
        <p className="card__body">
          All {state.maxReplacements} replacements are used. The newest recorded operation stands.
        </p>
      )
    case 'ready':
      return (
        <>
          {state.replacement && <p className="card__body drawer__warning">{COPY.replacementWarning}</p>}
          <p className="drawer__weight mono">
            Fixed weight {formatWeight(state.weight)} · sequence {state.sequence.toString()}
            {state.replacement && ` · ${state.replacementsLeft} replacement${state.replacementsLeft === 1 ? '' : 's'} left`}
          </p>
          <div
            className="drawer__options"
            role="radiogroup"
            aria-label="Choice"
            onKeyDown={(event) => {
              if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return
              event.preventDefault()
              const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown'
              const index = chosen ? OPTIONS.findIndex((o) => o.name === chosen) : -1
              const next = OPTIONS[(index + (forward ? 1 : -1) + OPTIONS.length) % OPTIONS.length]
              setChosen(next.name)
            }}
          >
            {OPTIONS.map((option) => (
              <button
                key={option.name}
                type="button"
                role="radio"
                aria-checked={chosen === option.name}
                className={chosen === option.name ? 'drawer__option is-chosen' : 'drawer__option'}
                onClick={() => setChosen(option.name)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="drawer__gateway">{COPY.gatewayPreparation}</p>
        </>
      )
  }
}
