import { useState } from 'react'
import { useAccount } from 'wagmi'

/** Fallback when the built-in dispenser is unconfigured or dry. */
const EXTERNAL_FAUCET = 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia'

type Status =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'sent'; hash: string }
  | { kind: 'error'; code: string }

/**
 * Test-ETH faucet. Calls the server-side /api/faucet (which holds the funding
 * key — never the client). Falls back to a public faucet link when the built-in
 * one is unconfigured or empty, so a first-timer is never stuck.
 */
export function Faucet() {
  const { address } = useAccount()
  const [manual, setManual] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const to = address ?? manual.trim()

  async function request() {
    if (!to) return
    setStatus({ kind: 'pending' })
    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address: to }),
      })
      const data = (await res.json().catch(() => ({}))) as { hash?: string; error?: string }
      if (res.ok && data.hash) setStatus({ kind: 'sent', hash: data.hash })
      else setStatus({ kind: 'error', code: data.error ?? 'unknown' })
    } catch {
      setStatus({ kind: 'error', code: 'network' })
    }
  }

  const useExternal =
    status.kind === 'error' &&
    (status.code === 'faucet_not_configured' || status.code === 'faucet_empty')

  return (
    <div className="faucet">
      <p className="faucet__lead muted">
        To vote you’ll connect a wallet — optional until then. No Sepolia ETH? Get 0.02 test ETH:
      </p>
      <div className="faucet__row">
        {!address && (
          <input
            className="faucet__input mono"
            placeholder="0x… your wallet address"
            value={manual}
            spellCheck={false}
            onChange={(e) => setManual(e.target.value)}
          />
        )}
        <button
          className="faucet__btn"
          type="button"
          onClick={request}
          disabled={!to || status.kind === 'pending'}
        >
          {status.kind === 'pending' ? 'Sending…' : 'Send test ETH'}
        </button>
      </div>
      {status.kind === 'sent' && (
        <p className="faucet__msg faucet__msg--ok">
          On its way —{' '}
          <a
            href={`https://sepolia.etherscan.io/tx/${status.hash}`}
            target="_blank"
            rel="noreferrer"
          >
            view transaction ↗
          </a>
        </p>
      )}
      {status.kind === 'error' && !useExternal && (
        <p className="faucet__msg faucet__msg--err">{errorText(status.code)}</p>
      )}
      {useExternal && (
        <p className="faucet__msg muted">
          Built-in faucet is unavailable right now —{' '}
          <a href={EXTERNAL_FAUCET} target="_blank" rel="noreferrer">
            use a public Sepolia faucet ↗
          </a>
        </p>
      )}
    </div>
  )
}

function errorText(code: string): string {
  switch (code) {
    case 'invalid_address':
      return 'That doesn’t look like a valid wallet address.'
    case 'already_funded':
      return 'That wallet already holds enough Sepolia ETH.'
    case 'network':
      return 'Network error — please try again.'
    default:
      return 'The faucet couldn’t send right now — try a public faucet instead.'
  }
}
