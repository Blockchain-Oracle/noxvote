import { useEffect, useRef, useState } from 'react'
import { parseEther } from 'viem'
import { useAccount, useBalance, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { activeChain } from '../config/chains.ts'

const truncate = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

/**
 * Header wallet control. Disconnected → a Connect button. Connected → the
 * address with a dropdown: switch account (re-opens the wallet's account
 * picker), switch network when on the wrong one, copy, explorer, disconnect.
 */
export function AccountMenu() {
  const { address, isConnected, connector, chainId } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const [open, setOpen] = useState(false)
  const [faucetMsg, setFaucetMsg] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const balance = useBalance({ address, query: { enabled: Boolean(address) } })

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!isConnected || !address) {
    const injected = connectors[0]
    return (
      <button
        className="acct__connect"
        type="button"
        disabled={isPending || !injected}
        onClick={() => injected && connect({ connector: injected, chainId: activeChain.id })}
      >
        {isPending ? 'Connecting…' : 'Connect'}
      </button>
    )
  }

  const wrongNetwork = chainId !== activeChain.id
  const lowFunds = (balance.data?.value ?? 0n) < parseEther('0.003')

  async function getFaucet() {
    setFaucetMsg('Sending…')
    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address }),
      })
      const data = (await res.json().catch(() => ({}))) as { hash?: string; error?: string }
      if (res.ok && data.hash) setFaucetMsg('Sent — balance updating…')
      else if (data.error === 'already_funded') setFaucetMsg('You already have enough.')
      else setFaucetMsg('Faucet is dry — use a public one.')
    } catch {
      setFaucetMsg('Failed — try again.')
    }
  }

  async function switchAccount() {
    setOpen(false)
    try {
      const provider = (await connector?.getProvider()) as
        | { request?: (args: unknown) => Promise<unknown> }
        | undefined
      await provider?.request?.({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] })
    } catch {
      /* user dismissed the wallet prompt */
    }
  }

  return (
    <div className="acct" ref={ref}>
      <button
        className="acct__btn"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={`acct__dot${wrongNetwork ? ' acct__dot--warn' : ''}`} aria-hidden="true" />
        <span className="mono">{truncate(address)}</span>
        <span className="acct__caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="acct__menu" role="menu">
          {wrongNetwork && (
            <button
              className="acct__item acct__item--warn"
              type="button"
              role="menuitem"
              onClick={() => {
                switchChain({ chainId: activeChain.id })
                setOpen(false)
              }}
            >
              Switch to {activeChain.name}
            </button>
          )}
          {lowFunds && (
            <p className="acct__note">Low on Sepolia ETH — you may not have enough for gas.</p>
          )}
          <button className="acct__item" type="button" role="menuitem" onClick={getFaucet}>
            Get test ETH
          </button>
          {faucetMsg && <p className="acct__note">{faucetMsg}</p>}
          <button
            className="acct__item"
            type="button"
            role="menuitem"
            onClick={() => {
              void navigator.clipboard?.writeText(address)
              setOpen(false)
            }}
          >
            Copy address
          </button>
          <a
            className="acct__item"
            role="menuitem"
            href={`https://sepolia.etherscan.io/address/${address}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
          >
            View on Etherscan ↗
          </a>
          <button className="acct__item" type="button" role="menuitem" onClick={switchAccount}>
            Switch account
          </button>
          <button
            className="acct__item acct__item--danger"
            type="button"
            role="menuitem"
            onClick={() => {
              disconnect()
              setOpen(false)
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
