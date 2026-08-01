import { useEffect, useState } from 'react'

/** Measured elapsed milliseconds since `startedAt`, ticking once a second.
 * Real time only — this is the lawful alternative to a progress figure. */
export function useElapsed(startedAt: number | null): number | null {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (startedAt === null) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [startedAt])
  return startedAt === null ? null : Math.max(0, now - startedAt)
}
