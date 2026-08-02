import { Link } from 'react-router'
import { useAccount } from 'wagmi'
import { Eyebrow } from '@noxvote/ui'

/** Public Sepolia faucet — the app never holds a funding key (the client bundle
 * is public), so first-timers are pointed outward for test ETH. */
const SEPOLIA_FAUCET = 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia'

/**
 * First-run orientation. There is no DAO directory to land in (by design), so a
 * cold visitor gets the three real entry paths instead of an empty list. Hidden
 * once a wallet is connected — returning members already know the way around.
 */
export function FirstRun() {
  const { isConnected } = useAccount()
  if (isConnected) return null
  return (
    <section className="firstrun" aria-label="Getting started">
      <Eyebrow>New here</Eyebrow>
      <p className="firstrun__lede">
        NoxVote turns on confidential outcomes for a DAO’s Safe or Governor. Your wallet and
        participation stay public; your choice stays private.
      </p>
      <div className="firstrun__paths">
        <div className="firstrun__path">
          <span className="firstrun__k mono">Browse</span>
          <span>Read any live ballot below — no wallet needed.</span>
        </div>
        <Link className="firstrun__path" to="/install">
          <span className="firstrun__k mono">Install</span>
          <span>Attach the adapter to your Safe or Governor →</span>
        </Link>
        <Link className="firstrun__path" to="/create">
          <span className="firstrun__k mono">Author</span>
          <span>Publish a proposal with a confidential outcome →</span>
        </Link>
      </div>
      <p className="firstrun__foot muted">
        To vote, connect your wallet — optional until then. No Sepolia ETH?{' '}
        <a href={SEPOLIA_FAUCET} target="_blank" rel="noreferrer">
          Get test funds from a faucet ↗
        </a>
      </p>
    </section>
  )
}
