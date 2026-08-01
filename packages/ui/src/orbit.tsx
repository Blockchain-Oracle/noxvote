import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useOnceVisible } from './motion.ts'

/** Canonical lifecycle stages (product vocabulary, surface map). */
const ORBIT_STAGES = [
  {
    x: 108,
    y: 138,
    name: 'Preparing encrypted handle',
    note: 'The Handle Gateway prepares the input and returns a handle the module can store.',
  },
  {
    x: 378,
    y: 90,
    name: 'Ready for wallet',
    note: 'The operation is assembled and waiting for you to sign it.',
  },
  {
    x: 622,
    y: 156,
    name: 'Submitting',
    note: 'The transaction goes on-chain. Your wallet and the time are now public.',
  },
  {
    x: 866,
    y: 88,
    name: 'Confidential computation',
    note: 'The Nox TEE stack folds the operation into the sealed totals. No progress figure is shown, because none is knowable.',
  },
  {
    x: 1100,
    y: 142,
    name: 'Recorded',
    note: 'A receipt confirms the operation status — not a plaintext choice.',
  },
] as const

const ARCS = [
  { len: 300, d: 'M 108 138 Q 240 42 378 90' },
  { len: 275, d: 'M 378 90 Q 502 190 622 156' },
  { len: 285, d: 'M 622 156 Q 748 34 866 88' },
  { len: 280, d: 'M 866 88 Q 986 214 1100 142' },
] as const

const DOTS = [
  { cx: 241, cy: 78 },
  { cx: 746, cy: 78 },
] as const

const GLYPHS: ReactNode[] = [
  <>
    <rect x="3" y="12" width="26" height="8" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <rect x="7.5" y="14.5" width="9" height="3" rx="1.5" fill="currentColor" />
  </>,
  <>
    <rect x="4" y="9" width="24" height="15" rx="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="22" cy="16.5" r="2" fill="currentColor" />
  </>,
  <>
    <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M16 21.6 V 11.4 M11.9 15.5 L16 11.4 L20.1 15.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>,
  <>
    <circle
      cx="16"
      cy="16"
      r="11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeDasharray="3 3.6"
      strokeLinecap="round"
    />
    <rect x="8.5" y="13" width="15" height="6" rx="3" fill="currentColor" />
  </>,
  <>
    <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M10.9 16.5 L14.4 20 L21.3 12.7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>,
]

/**
 * The signature gesture: the orbit draws itself on first visibility, then a
 * white satellite docks onto each rim in sequence. Reduced motion renders the
 * fully drawn end state. Desktop-only arrangement — below 1080px the stages
 * stack and the arcs are removed (orbit.css).
 */
export function OrbitConstellation() {
  const [drawn, setDrawn] = useState(false)
  const [docked, setDocked] = useState(0)
  const arcsRef = useRef<SVGSVGElement | null>(null)
  const timers = useRef<number[]>([])

  /* Measure real arc lengths; the authored --len values are fallback only. */
  useLayoutEffect(() => {
    const svg = arcsRef.current
    if (!svg) return
    for (const path of svg.querySelectorAll('path')) {
      if (typeof path.getTotalLength === 'function') {
        path.style.setProperty('--len', String(path.getTotalLength()))
      }
    }
  }, [])

  const ref = useOnceVisible<HTMLDivElement>((reduced) => {
    setDrawn(true)
    if (reduced) {
      /* End state, synchronously — scheduling would race StrictMode cleanup. */
      setDocked(ORBIT_STAGES.length)
      return
    }
    ORBIT_STAGES.forEach((_, i) => {
      const id = window.setTimeout(() => setDocked((n) => Math.max(n, i + 1)), 260 + i * 150)
      timers.current.push(id)
    })
  }, 0.2)

  useLayoutEffect(() => {
    const pending = timers.current
    return () => pending.forEach((id) => window.clearTimeout(id))
  }, [])

  return (
    <div className="orbit__stage" role="list" ref={ref}>
      <svg
        className={drawn ? 'orbit__arcs is-drawn' : 'orbit__arcs'}
        ref={arcsRef}
        viewBox="0 0 1200 400"
        fill="none"
        aria-hidden="true"
      >
        {ARCS.map((arc) => (
          <path key={arc.d} style={{ '--len': arc.len } as CSSProperties} d={arc.d} />
        ))}
        {DOTS.map((dot) => (
          <circle key={dot.cx} cx={dot.cx} cy={dot.cy} r="4.5" />
        ))}
      </svg>

      {ORBIT_STAGES.map((stage, i) => (
        <div
          key={stage.name}
          role="listitem"
          className={i < docked ? 'stg is-docked' : 'stg'}
          style={{ '--x': stage.x, '--y': stage.y } as CSSProperties}
        >
          <div className="stg__circle">
            <svg className="stg__glyph" viewBox="0 0 32 32" aria-hidden="true">
              {GLYPHS[i]}
            </svg>
            <span className="stg__sat">{String(i + 1).padStart(2, '0')}</span>
          </div>
          <div className="stg__text">
            <div className="stg__name">{stage.name}</div>
            <p className="stg__note">{stage.note}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
