import { useEffect, useRef } from 'react'

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
