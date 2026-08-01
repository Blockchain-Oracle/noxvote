import { Pill } from '@noxvote/ui'
import { useAccount, useConnect, useSwitchChain } from 'wagmi'
import { activeChain } from '../../config/chains.ts'
import type { Hex } from '../../config/addresses.ts'
import { COPY } from '../../lib/copy.ts'
import { formatWeight, truncateHex } from '../../lib/format.ts'
import { DetailedState, type BallotRecordView, type BallotReceiptView } from '../../state/chain.ts'
import { useEligibilityWeight } from '../../hooks/useEligibility.ts'
import { useReceipt } from '../../hooks/useBallot.ts'

/**
 * The connected wallet's own standing: connection, network, public
 * eligibility, and the public receipt facts. It never repeats a choice —
 * there is no choice to repeat.
 */
export function VoterCard({
  core,
  ballotId,
  record,
  detailed,
}: {
  core: Hex
  ballotId: Hex
  record: BallotRecordView
  detailed: DetailedState
}) {
  const { address, chainId, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { switchChain } = useSwitchChain()
  const eligibility = useEligibilityWeight(core, ballotId, record, address)
  const receipt = useReceipt(core, ballotId, address)

  const body = () => {
    if (!isConnected || !address) {
      return (
        <>
          <p className="card__body">
            Connect a wallet to check eligibility and your operation status.
          </p>
          <Pill
            onClick={() => connectors[0] && connect({ connector: connectors[0] })}
            className="voter__action"
          >
            {isPending ? 'Connecting…' : 'Connect wallet'}
          </Pill>
        </>
      )
    }
    if (chainId !== activeChain.id) {
      return (
        <>
          <p className="card__body">
            This wallet is on another network. Switch to {activeChain.name} to continue.
          </p>
          <Pill onClick={() => switchChain({ chainId: activeChain.id })} className="voter__action">
            Switch network
          </Pill>
        </>
      )
    }
    return (
      <>
        {detailed === DetailedState.Open && receipt.data?.recorded && (
          <p className="card__body voter__recorded">{COPY.ballotRecorded}.</p>
        )}
        <dl className="rules">
          <div className="rules__row">
            <dt>Wallet</dt>
            <dd className="mono">{truncateHex(address)}</dd>
          </div>
          <EligibilityRow query={eligibility} />
          <ReceiptRows receipt={receipt.data} record={record} />
          {detailed !== DetailedState.Open && (
            <div className="rules__row">
              <dt>Voting</dt>
              <dd className="mono">Not open</dd>
            </div>
          )}
        </dl>
      </>
    )
  }

  return (
    <section className="card">
      <h2 className="card__title">Your standing</h2>
      {body()}
      <p className="card__note">{COPY.promise}</p>
    </section>
  )
}

function EligibilityRow({ query }: { query: ReturnType<typeof useEligibilityWeight> }) {
  const value = query.isPending
    ? 'Checking at snapshot…'
    : query.isError
      ? 'Needs the organizer-provided allowlist proof'
      : query.data === 0n
        ? 'Not eligible at snapshot'
        : `Eligible — fixed weight ${formatWeight(query.data)}`
  return (
    <div className="rules__row">
      <dt>Eligibility</dt>
      <dd className="mono">{value}</dd>
    </div>
  )
}

function ReceiptRows({
  receipt,
  record,
}: {
  receipt: BallotReceiptView | undefined
  record: BallotRecordView
}) {
  if (!receipt?.recorded) return null
  return (
    <>
      <div className="rules__row">
        <dt>Status</dt>
        <dd className="mono">Recorded — Effective</dd>
      </div>
      <div className="rules__row">
        <dt>Sequence</dt>
        <dd className="mono">{receipt.sequence.toString()}</dd>
      </div>
      <div className="rules__row">
        <dt>Replacements remaining</dt>
        <dd className="mono">{record.maxReplacements - receipt.replacementsUsed}</dd>
      </div>
    </>
  )
}
