import { Link } from 'react-router'
import { Eyebrow, Pill } from '@noxvote/ui'
import { useAccount, useConnect, useSwitchChain } from 'wagmi'
import { Boundaries } from '../components/install/Boundaries.tsx'
import { GovernorHostCard } from '../components/install/GovernorHostCard.tsx'
import { SafeHostCard } from '../components/install/SafeHostCard.tsx'
import { activeChain } from '../config/chains.ts'
import { hasGovernor, hasSafe } from '../hooks/useInstall.ts'

/**
 * Screen 1: confidential-voting overview. The deployed hosts are known from
 * the configuration, so they render without a wallet; connection and network
 * are the only wallet-dependent states, surfaced as a banner. Unsupported
 * host never occurs on a configured profile — the honest signal there is the
 * app's own unconfigured screen.
 */
export function Install() {
  const { isConnected, chainId } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { switchChain } = useSwitchChain()
  const wrongNetwork = isConnected && chainId !== activeChain.id

  return (
    <>
      <p className="detail__back">
        <Link to="/">&larr; All proposals</Link>
      </p>
      <Eyebrow>Confidential voting</Eyebrow>
      <h1 className="d-lg list__title">Adapters on {activeChain.name}</h1>
      <p className="lead muted list__lead">
        A confidential ballot core runs behind a Safe execution adapter and a compatible Governor
        adapter. Both are already deployed and verified below; review the exact authority each holds
        before you rely on it.
      </p>

      {!isConnected && (
        <div className="install__banner">
          <span>Connect a wallet to check you are on the right network.</span>
          <Pill
            onClick={() => connectors[0] && connect({ connector: connectors[0] })}
            className="voter__action"
          >
            {isPending ? 'Connecting…' : 'Connect wallet'}
          </Pill>
        </div>
      )}
      {wrongNetwork && (
        <div className="install__banner install__banner--warn">
          <span>This wallet is on another network. Switch to {activeChain.name}.</span>
          <Pill onClick={() => switchChain({ chainId: activeChain.id })} className="voter__action">
            Switch network
          </Pill>
        </div>
      )}

      <div className="install__grid">
        <Boundaries />
        {hasSafe() && <SafeHostCard />}
        {hasGovernor() && <GovernorHostCard />}
      </div>
    </>
  )
}
