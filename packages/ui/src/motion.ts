import { useEffect, useRef, useState } from 'react'

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Fires `enter(reduced)` once, the first time the referenced element becomes
 * visible. Under reduced motion (or without IntersectionObserver) it fires
 * immediately, so the caller renders the finished end state — never a paused
 * half-drawn one.
 */
export function useOnceVisible<T extends Element>(
  enter: (reduced: boolean) => void,
  threshold = 0.25,
) {
  const ref = useRef<T | null>(null)
  const enterRef = useRef(enter)
  enterRef.current = enter
  const firedRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || firedRef.current) return
    const fire = (reduced: boolean) => {
      if (firedRef.current) return
      firedRef.current = true
      enterRef.current(reduced)
    }
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      fire(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            fire(false)
            io.disconnect()
          }
        }
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])

  return ref
}

/**
 * Staggered entrance on first visibility: `shown` counts items revealed so
 * far, `entered` flips once when the element first becomes visible. Under
 * reduced motion every item appears at once, synchronously — scheduling
 * would race StrictMode cleanup. Pending timers are cleared on unmount, so
 * consumers must never schedule their own reveal timeouts.
 */
export function useStaggerReveal<T extends Element>(
  count: number,
  { step, base = 0, threshold }: { step: number; base?: number; threshold?: number },
) {
  const [entered, setEntered] = useState(false)
  const [shown, setShown] = useState(0)
  const timers = useRef<number[]>([])

  const ref = useOnceVisible<T>((reduced) => {
    setEntered(true)
    if (reduced) {
      setShown(count)
      return
    }
    for (let i = 0; i < count; i++) {
      timers.current.push(
        window.setTimeout(() => setShown((n) => Math.max(n, i + 1)), base + i * step),
      )
    }
  }, threshold)

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((id) => window.clearTimeout(id))
  }, [])

  return { ref, shown, entered }
}
