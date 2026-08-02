import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  useAccount,
  useBalance,
  useConnect,
  usePublicClient,
  useReadContract,
  useWalletClient,
} from 'wagmi'
import { parseEther } from 'viem'
import { votesTokenAbi } from '../abi/votesToken.ts'
import { profile, type Hex } from '../config/addresses.ts'
import { activeChain } from '../config/chains.ts'

const STORAGE_KEY = 'noxvote:onboarded'
const LOW_BALANCE = parseEther('0.003')
const MINT_AMOUNT = 1000n * 10n ** 18n
const EXTERNAL_FAUCET = 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia'

const tokenAddress = (): Hex | undefined =>
  profile.kind === 'sepolia' ? profile.contracts.votesToken : undefined

const truncate = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

/**
 * First-run onboarding, three skippable steps: connect → fund → voting power.
 * Dismissal (skip or finish) persists in localStorage so it never re-nags on
 * refresh. Reuses the same faucet endpoint and mint/delegate calls the inline
 * panels use, just wrapped in a guided flow.
 */
export function Onboarding() {
  const [done, setDone] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1',
  )
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const navigate = useNavigate()
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const token = tokenAddress()

  const balance = useBalance({ address, query: { enabled: Boolean(address), refetchInterval: 8000 } })
  const votes = useReadContract({
    address: token,
    abi: votesTokenAbi,
    functionName: 'getVotes',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(token && address), refetchInterval: 8000 },
  })

  if (done) return null

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* private mode */
    }
    setDone(true)
  }

  const lowFunds = (balance.data?.value ?? 0n) < LOW_BALANCE
  const hasPower = (votes.data ?? 0n) > 0n

  async function getFaucet() {
    if (!address) return
    setBusy('faucet')
    setNote(null)
    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address }),
      })
      const data = (await res.json().catch(() => ({}))) as { hash?: string; error?: string }
      if (res.ok && data.hash) {
        setNote('Sent — your balance will update shortly.')
        setTimeout(() => void balance.refetch(), 4000)
      } else if (data.error === 'already_funded') {
        setNote('You already have enough Sepolia ETH.')
      } else {
        setNote('external')
      }
    } catch {
      setNote('external')
    }
    setBusy(null)
  }

  async function getPower() {
    if (!walletClient || !publicClient || !token || !address) return
    setNote(null)
    try {
      const held = await publicClient.readContract({
        address: token,
        abi: votesTokenAbi,
        functionName: 'balanceOf',
        args: [address],
      })
      if (held === 0n) {
        setBusy('Minting 1000 PIV…')
        const mintHash = await walletClient.writeContract({
          address: token,
          abi: votesTokenAbi,
          functionName: 'mint',
          args: [address, MINT_AMOUNT],
        })
        await publicClient.waitForTransactionReceipt({ hash: mintHash })
      }
      setBusy('Delegating to yourself…')
      const delegateHash = await walletClient.writeContract({
        address: token,
        abi: votesTokenAbi,
        functionName: 'delegate',
        args: [address],
      })
      await publicClient.waitForTransactionReceipt({ hash: delegateHash })
      await votes.refetch()
    } catch (e) {
      const message = e instanceof Error ? (e as { shortMessage?: string }).shortMessage ?? e.message : String(e)
      setNote(/insufficient|funds|gas/i.test(message) ? 'Not enough gas — grab test ETH first (step 2).' : message.slice(0, 140))
    }
    setBusy(null)
  }

  const injected = connectors[0]

  const STEPS = [
    {
      title: 'Connect your wallet',
      render: () =>
        isConnected && address ? (
          <>
            <p className="onb__body">
              <span className="onb__ok">Connected</span> — <span className="mono">{truncate(address)}</span>. You’re
              on {activeChain.name}.
            </p>
            <Actions primary={{ label: 'Next', onClick: () => setStep(1) }} onSkip={finish} />
          </>
        ) : (
          <>
            <p className="onb__body">
              NoxVote runs on {activeChain.name} testnet. Connect a wallet to take part — your wallet
              and participation are public, your choice stays private.
            </p>
            <Actions
              primary={{
                label: isPending ? 'Connecting…' : 'Connect wallet',
                disabled: isPending || !injected,
                onClick: () => injected && connect({ connector: injected, chainId: activeChain.id }),
              }}
              onSkip={finish}
            />
          </>
        ),
    },
    {
      title: 'Get some test ETH',
      render: () => (
        <>
          <p className="onb__body">
            {!isConnected
              ? 'Connect a wallet first (step 1).'
              : lowFunds
                ? 'You don’t have enough Sepolia ETH to sign transactions. Grab a little — it’s free test ETH.'
                : 'You’re funded — enough Sepolia ETH to transact.'}
          </p>
          <Actions
            primary={
              isConnected && lowFunds
                ? { label: busy === 'faucet' ? 'Sending…' : 'Get test ETH', disabled: busy === 'faucet', onClick: getFaucet }
                : { label: 'Next', onClick: () => setStep(2) }
            }
            back={() => setStep(0)}
            onSkip={finish}
          />
          {note === 'external' ? (
            <p className="onb__note">
              Our faucet is dry right now —{' '}
              <a href={EXTERNAL_FAUCET} target="_blank" rel="noreferrer">
                use a public Sepolia faucet ↗
              </a>
            </p>
          ) : note ? (
            <p className="onb__note">{note}</p>
          ) : null}
        </>
      ),
    },
    {
      title: 'Get voting power',
      render: () => (
        <>
          <p className="onb__body">
            {hasPower ? (
              <>
                <span className="onb__ok">You can vote.</span> Create a confidential proposal, or explore the ballots.
              </>
            ) : (
              'Governance tokens only count once delegated. Mint test tokens and delegate to yourself in one step.'
            )}
          </p>
          <Actions
            primary={
              hasPower
                ? { label: 'Create a proposal', onClick: () => { finish(); navigate('/create') } }
                : { label: busy ? busy : 'Mint & delegate', disabled: Boolean(busy) || !walletClient, onClick: getPower }
            }
            back={() => setStep(1)}
            onSkip={finish}
            skipLabel={hasPower ? 'Done' : 'Skip'}
          />
          {note && note !== 'external' && <p className="onb__note">{note}</p>}
        </>
      ),
    },
  ]

  return (
    <div className="onb__scrim" role="dialog" aria-modal="true" aria-label="Getting started">
      <div className="onb">
        <button className="onb__skip" type="button" onClick={finish}>
          Skip
        </button>
        <div className="onb__dots" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={`onb__dot${i <= step ? ' onb__dot--on' : ''}`} />
          ))}
        </div>
        <p className="eyebrow">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 className="onb__title">{STEPS[step].title}</h2>
        {STEPS[step].render()}
      </div>
    </div>
  )
}

function Actions({
  primary,
  back,
  onSkip,
  skipLabel = 'Skip',
}: {
  primary: { label: string; onClick: () => void; disabled?: boolean }
  back?: () => void
  onSkip: () => void
  skipLabel?: string
}) {
  return (
    <div className="onb__actions">
      <button className="onb__primary" type="button" disabled={primary.disabled} onClick={primary.onClick}>
        {primary.label}
      </button>
      {back && (
        <button className="onb__ghost" type="button" onClick={back}>
          Back
        </button>
      )}
      <span className="onb__spacer" />
      <button className="onb__ghost" type="button" onClick={onSkip}>
        {skipLabel}
      </button>
    </div>
  )
}
