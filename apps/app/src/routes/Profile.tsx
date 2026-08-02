import { Link } from 'react-router'
import { useAccount, useBalance, useReadContract } from 'wagmi'
import { formatEther, parseEther } from 'viem'
import { Eyebrow } from '@noxvote/ui'
import { Faucet } from '../components/Faucet.tsx'
import { MintVotes } from '../components/MintVotes.tsx'
import { votesTokenAbi } from '../abi/votesToken.ts'
import { profile, type Hex } from '../config/addresses.ts'
import { useBallotList } from '../hooks/useBallotList.ts'
import { useReceipt } from '../hooks/useBallot.ts'
import { truncateHex } from '../lib/format.ts'
import { detailPath } from './ProposalList.tsx'

const tokenAddress = (): Hex | undefined =>
  profile.kind === 'sepolia' ? profile.contracts.votesToken : undefined

/** Everything the connected wallet is on our platform: balances, voting power,
 * the two setup actions (only when actually needed), and the ballots it voted
 * on. One place, so the rest of the app stops prompting. */
export function Profile() {
  const { address, isConnected } = useAccount()
  const token = tokenAddress()
  const eth = useBalance({ address, query: { enabled: Boolean(address) } })
  const balanceRead = { address: token, abi: votesTokenAbi } as const
  const piv = useReadContract({
    ...balanceRead,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(token && address) },
  })
  const votes = useReadContract({
    ...balanceRead,
    functionName: 'getVotes',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(token && address) },
  })

  if (!isConnected || !address) {
    return (
      <>
        <Eyebrow>Profile</Eyebrow>
        <h1 className="d-lg">Connect to view your profile</h1>
        <p className="lead muted">
          Connect a wallet (top right) to see your balances, voting power, and the ballots you’ve
          voted on.
        </p>
      </>
    )
  }

  const lowEth = (eth.data?.value ?? 0n) < parseEther('0.003')

  return (
    <>
      <Eyebrow>Profile</Eyebrow>
      <h1 className="d-lg">Your account</h1>
      <p className="lead muted profile__addr">
        <span className="mono">{address}</span>{' '}
        <a href={`https://sepolia.etherscan.io/address/${address}`} target="_blank" rel="noreferrer">
          Etherscan ↗
        </a>
      </p>

      <div className="profile__stats">
        <Stat label="Sepolia ETH" value={Number(formatEther(eth.data?.value ?? 0n)).toFixed(4)} />
        <Stat label="Governance tokens (PIV)" value={fmtToken(piv.data)} />
        <Stat label="Voting power" value={fmtToken(votes.data)} />
      </div>

      {lowEth && <Faucet />}
      <MintVotes />

      <section className="profile__activity">
        <h2 className="profile__h2">Ballots you’ve voted on</h2>
        <Activity address={address} />
      </section>
    </>
  )
}

function fmtToken(value: bigint | undefined): string {
  if (value === undefined) return '—'
  return Number(formatEther(value)).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile__stat">
      <span className="profile__stat-value mono">{value}</span>
      <span className="profile__stat-label">{label}</span>
    </div>
  )
}

function Activity({ address }: { address: Hex }) {
  const list = useBallotList()
  if (list.isPending) return <p className="muted">Loading…</p>
  const rows = list.data ?? []
  if (rows.length === 0) return <p className="muted">No ballots on this network yet.</p>
  return (
    <div className="profile__votes">
      {rows.map((row) => (
        <ActivityRow key={row.ballotId} core={row.core} ballotId={row.ballotId} address={address} />
      ))}
      <p className="muted profile__hint">Only ballots where you recorded a vote appear here.</p>
    </div>
  )
}

function ActivityRow({ core, ballotId, address }: { core: Hex; ballotId: Hex; address: Hex }) {
  const receipt = useReceipt(core, ballotId, address)
  if (!receipt.data?.recorded) return null
  return (
    <Link className="profile__vote" to={detailPath(core, ballotId)}>
      <span className="mono">{truncateHex(ballotId, 10, 6)}</span>
      <span className="profile__vote-tag">Recorded · seq {receipt.data.sequence.toString()}</span>
    </Link>
  )
}
