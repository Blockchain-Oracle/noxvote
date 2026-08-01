import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { Redact } from '@noxvote/ui'
import { COPY } from '../lib/copy.ts'

/** Skeleton placeholders — never zero-value data stand-ins (surface map:
 * "no zero-value participation placeholders"). */
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="skeleton__line" />
      ))}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-card state-card--error" role="alert">
      <p className="state-card__title">Something is wrong</p>
      <p className="state-card__body">{message}</p>
      {onRetry && (
        <button type="button" className="state-card__action" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="state-card">
      <p className="state-card__title">{title}</p>
      <p className="state-card__body">{body}</p>
    </div>
  )
}

/** The deliberately sealed running result: rendered intent, never blank/zero. */
export function RedactedResult({ label = 'Running result' }: { label?: string }) {
  return (
    <div className="redacted-result">
      <span className="redacted-result__label">{label}</span>
      <Redact />
      <span className="redacted-result__note mono">{COPY.hiddenByDesign}</span>
    </div>
  )
}

/** Every fixture-fed screen carries this visibly (SPEC R8) until it wires. */
export function FixtureBanner() {
  return (
    <p className="fixture-banner mono" role="note">
      Design fixture — not live chain data
    </p>
  )
}

/**
 * The one loading/error/empty convention (TanStack status driven, no
 * Suspense). Screens hand the query over; data renders through `children`.
 */
export function QueryBoundary<T>({
  query,
  skeletonLines,
  empty,
  isEmpty,
  children,
}: {
  query: UseQueryResult<T>
  skeletonLines?: number
  empty?: { title: string; body: string }
  isEmpty?: (data: T) => boolean
  children: (data: T) => ReactNode
}) {
  if (query.isPending) return <Skeleton lines={skeletonLines} />
  if (query.isError) {
    return <ErrorState message={describeQueryError(query.error)} onRetry={() => void query.refetch()} />
  }
  if (empty && (isEmpty?.(query.data) ?? false)) return <EmptyState {...empty} />
  return <>{children(query.data)}</>
}

function describeQueryError(error: unknown): string {
  const short = (error as { shortMessage?: string }).shortMessage
  if (short) return short
  return error instanceof Error ? error.message : String(error)
}
