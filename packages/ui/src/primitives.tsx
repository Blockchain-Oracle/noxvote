import type { ReactNode, MouseEventHandler } from 'react'
import { BRAND } from './brand.ts'

const PILL_VARIANT = {
  ink: '',
  'on-ink': 'pill--on-ink',
  'on-ink-ghost': 'pill--on-ink-ghost',
} as const

type PillVariant = keyof typeof PILL_VARIANT

export function Pill({
  variant = 'ink',
  arrow = false,
  href,
  onClick,
  className,
  children,
}: {
  variant?: PillVariant
  arrow?: boolean
  href?: string
  onClick?: MouseEventHandler
  className?: string
  children: ReactNode
}) {
  const cls = ['pill', PILL_VARIANT[variant], className].filter(Boolean).join(' ')
  const body = (
    <>
      {children}
      {arrow && (
        <span className="pill__arrow" aria-hidden="true">
          &rarr;
        </span>
      )}
    </>
  )
  return href ? (
    <a className={cls} href={href} onClick={onClick}>
      {body}
    </a>
  ) : (
    <button className={cls} type="button" onClick={onClick}>
      {body}
    </button>
  )
}

export function Eyebrow({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={['eyebrow', className].filter(Boolean).join(' ')}>{children}</p>
}

export type ChipState = 'recorded' | 'withheld' | 'passed'

/** Lifecycle chip — the only place the state triad may appear (DESIGN.md law). */
export function Chip({ state, children }: { state: ChipState; children: ReactNode }) {
  return <span className={`chip chip--${state}`}>{children}</span>
}

/** The sealed cell. Never resolves, at any breakpoint — rendered intent, not absence. */
export function Redact() {
  return <span className="redact" role="img" aria-label="Choice sealed by design" />
}

/** Wordmark: orbit ring with an ember satellite. */
export function Mark({ href = '#top', label = BRAND }: { href?: string; label?: string }) {
  return (
    <a className="mark" href={href}>
      <svg className="mark__glyph" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="13" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <circle className="mark__sat" cx="18.8" cy="6.2" r="3.1" />
      </svg>
      <span>{label}</span>
    </a>
  )
}
