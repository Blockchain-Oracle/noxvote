import { useState } from 'react'
import { addressUrl, txUrl } from '../lib/explorer.ts'
import { truncateHex } from '../lib/format.ts'

type Trunc = { head?: number; tail?: number }

/**
 * A transaction hash or address rendered as a link to the active chain's block
 * explorer. When no explorer is configured (local chain) it degrades to a copy
 * affordance — never a dead link.
 */
export function ExplorerLink({
  kind,
  value,
  head = 10,
  tail = 8,
}: { kind: 'tx' | 'address'; value: string } & Trunc) {
  const url = kind === 'tx' ? txUrl(value) : addressUrl(value)
  if (!url) return <CopyHash value={value} head={head} tail={tail} />
  return (
    <a className="hash-link" href={url} target="_blank" rel="noopener noreferrer">
      {truncateHex(value, head, tail)}
      <span className="hash-ext" aria-hidden="true">
        ↗
      </span>
    </a>
  )
}

/**
 * A bytes32 value (commitment, handle, calldata) that no explorer can resolve —
 * so it copies to the clipboard in full instead of pretending to be a link.
 */
export function CopyHash({ value, head = 10, tail = 8 }: { value: string } & Trunc) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    if (!navigator.clipboard) return
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1400)
      })
      .catch(() => {})
  }
  return (
    <button
      type="button"
      className={`hash-copy${copied ? ' is-copied' : ''}`}
      onClick={copy}
      aria-label={copied ? 'Copied to clipboard' : `Copy ${value}`}
    >
      {truncateHex(value, head, tail)}
      <span className="hash-ext" aria-hidden="true">
        {copied ? <CheckGlyph /> : <CopyGlyph />}
      </span>
    </button>
  )
}

function CopyGlyph() {
  return (
    <svg className="hash-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  )
}

function CheckGlyph() {
  return (
    <svg className="hash-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
