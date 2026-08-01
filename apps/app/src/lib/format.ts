/** Presentation-only formatting. No formatting function may invent data a
 * chain read did not return — absence renders as absence upstream. */

export function truncateHex(value: string, head = 6, tail = 4): string {
  if (value.length <= head + tail + 1) return value
  return `${value.slice(0, head)}…${value.slice(-tail)}`
}

export function formatWeight(weight: bigint): string {
  return weight.toLocaleString('en-US')
}

export function formatDateTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

/** Real elapsed time as `01m 42s` — measured, never estimated. */
export function formatElapsed(milliseconds: number): string {
  const total = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    return `${pad(hours)}h ${pad(minutes % 60)}m`
  }
  return `${pad(minutes)}m ${pad(seconds)}s`
}

/** Countdown to a host-clock boundary, e.g. `01h 42m remaining`. */
export function formatRemaining(milliseconds: number): string {
  const total = Math.max(0, Math.floor(milliseconds / 1000))
  const pad = (n: number) => String(n).padStart(2, '0')
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours > 0) return `${pad(hours)}h ${pad(minutes)}m remaining`
  return `${pad(minutes)}m ${pad(total % 60)}s remaining`
}
