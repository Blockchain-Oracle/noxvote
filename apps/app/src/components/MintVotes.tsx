import { useState } from 'react'
import { useAccount, usePublicClient, useReadContract, useWalletClient } from 'wagmi'
import { Eyebrow } from '@noxvote/ui'
import { votesTokenAbi } from '../abi/votesToken.ts'
import { profile, type Hex } from '../config/addresses.ts'

/** Demo mint size — 1000 governance tokens, enough to be an eligible voter. */
const MINT_AMOUNT = 1000n * 10n ** 18n

const tokenAddress = (): Hex | undefined =>
  profile.kind === 'sepolia' ? profile.contracts.votesToken : undefined

type Step =
  | { kind: 'idle' }
  | { kind: 'busy'; label: string }
  | { kind: 'done'; hash: Hex }
  | { kind: 'error'; message: string }

/**
 * In-app path to voting power. ERC20Votes only counts *delegated* balance, so a
 * fresh wallet has zero votes until it mints and self-delegates. Shown only when
 * a connected wallet has no voting power; hides itself once it does. Power
 * applies from the next block, so a proposal must be created after this to vote.
 */
export function MintVotes({ compact = false }: { compact?: boolean } = {}) {
  const token = tokenAddress()
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const [step, setStep] = useState<Step>({ kind: 'idle' })

  const votes = useReadContract({
    address: token,
    abi: votesTokenAbi,
    functionName: 'getVotes',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(token && address) },
  })
  const balance = useReadContract({
    address: token,
    abi: votesTokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(token && address) },
  })
  const delegatee = useReadContract({
    address: token,
    abi: votesTokenAbi,
    functionName: 'delegates',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(token && address) },
  })

  // Nothing to offer: no token on this profile, not connected, or already powered.
  if (!token || !isConnected || !address) return null
  if ((votes.data ?? 0n) > 0n) return null

  const hasBalance = (balance.data ?? 0n) > 0n
  const delegateOnly = hasBalance && delegatee.data?.toLowerCase() !== address.toLowerCase()

  async function getPower() {
    if (!walletClient || !publicClient || !token || !address) return
    try {
      if (!hasBalance) {
        setStep({ kind: 'busy', label: 'Minting 1000 PIV…' })
        const mintHash = await walletClient.writeContract({
          address: token,
          abi: votesTokenAbi,
          functionName: 'mint',
          args: [address, MINT_AMOUNT],
        })
        await publicClient.waitForTransactionReceipt({ hash: mintHash })
      }
      setStep({ kind: 'busy', label: 'Delegating to yourself…' })
      const delegateHash = await walletClient.writeContract({
        address: token,
        abi: votesTokenAbi,
        functionName: 'delegate',
        args: [address],
      })
      await publicClient.waitForTransactionReceipt({ hash: delegateHash })
      await Promise.all([votes.refetch(), balance.refetch(), delegatee.refetch()])
      setStep({ kind: 'done', hash: delegateHash })
    } catch (e) {
      const msg = e instanceof Error ? (e as { shortMessage?: string }).shortMessage ?? e.message : String(e)
      setStep({ kind: 'error', message: msg.slice(0, 180) })
    }
  }

  return (
    <section
      className={compact ? 'mintvotes mintvotes--inline' : 'mintvotes'}
      aria-label="Get voting power"
    >
      <Eyebrow>Voting power</Eyebrow>
      <p className="mintvotes__lede">
        This wallet holds no governance voting power yet.{' '}
        {delegateOnly
          ? 'Delegate your tokens to yourself to activate it.'
          : 'Mint test tokens and delegate to yourself — then create a proposal to vote on.'}
      </p>
      <button
        className="mintvotes__btn"
        type="button"
        disabled={step.kind === 'busy' || !walletClient}
        onClick={getPower}
      >
        {step.kind === 'busy' ? step.label : delegateOnly ? 'Delegate to myself' : 'Mint & delegate'}
      </button>
      {step.kind === 'done' && (
        <p className="mintvotes__msg mintvotes__msg--ok">
          Voting power active.{' '}
          <a
            href={`https://sepolia.etherscan.io/tx/${step.hash}`}
            target="_blank"
            rel="noreferrer"
          >
            view tx ↗
          </a>{' '}
          — now create a proposal and you can vote on it.
        </p>
      )}
      {step.kind === 'error' && (
        <p className="mintvotes__msg mintvotes__msg--err">
          {step.message} {/insufficient|funds|gas/i.test(step.message) && '— you may need Sepolia ETH first.'}
        </p>
      )}
    </section>
  )
}
