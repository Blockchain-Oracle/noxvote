import { Pill } from '@noxvote/ui'
import { useConnect, useSwitchChain } from 'wagmi'
import { activeChain } from '../../config/chains.ts'
import { COPY } from '../../lib/copy.ts'
import { formatWeight, truncateHex } from '../../lib/format.ts'
import {
  DetailedState,
  isTerminal,
  type BallotRecordView,
  type BallotReceiptView,
} from '../../state/chain.ts'
import type { VoterStanding } from '../../state/proposalDetail.ts'

/**
 * The connected wallet's own standing, rendered purely from the standing
 * projection. It never repeats a choice — there is no choice to repeat.
 */
export function VoterCard({
  record,
  detailed,
  standing,
  receipt,
  wallet,
  eligibilityNeedsProof,
  onCast,
  onChangeVote,
}: {
  record: BallotRecordView
  detailed: DetailedState
  standing: VoterStanding
  receipt: BallotReceiptView | undefined
  wallet: `0x${string}` | undefined
  eligibilityNeedsProof: boolean
  onCast?: () => void
  onChangeVote?: () => void
}) {
  const { connect, connectors, isPending } = useConnect()
  const { switchChain } = useSwitchChain()

  const body = () => {
    switch (standing.kind) {
      case 'disconnected': {
        const settled = isTerminal(detailed)
        return (
          <>
            <p className="card__body">
              {settled
                ? 'Voting has closed and the outcome is settled. Every operation is recorded publicly — connect a wallet only to confirm your own was recorded.'
                : 'Connect a wallet to check eligibility and your operation status.'}
            </p>
            <Pill
              onClick={() =>
                connectors[0] && connect({ connector: connectors[0], chainId: activeChain.id })
              }
              className="voter__action"
            >
              {isPending ? 'Connecting…' : 'Connect wallet'}
            </Pill>
          </>
        )
      }
      case 'wrong-network':
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
      case 'checking':
      case 'ineligible':
      case 'eligible':
        return (
          <>
            {detailed === DetailedState.Open && receipt?.recorded && (
              <p className="card__body voter__recorded">{COPY.ballotRecorded}.</p>
            )}
            <dl className="rules">
              {wallet && (
                <div className="rules__row">
                  <dt>Wallet</dt>
                  <dd className="mono">{truncateHex(wallet)}</dd>
                </div>
              )}
              <div className="rules__row">
                <dt>Eligibility</dt>
                <dd className="mono">
                  {standing.kind === 'checking'
                    ? 'Checking at snapshot…'
                    : standing.kind === 'ineligible'
                      ? eligibilityNeedsProof
                        ? 'Needs the organizer-provided allowlist proof'
                        : 'Not eligible at snapshot'
                      : `Eligible — fixed weight ${formatWeight(standing.weight)}`}
                </dd>
              </div>
              <ReceiptRows receipt={receipt} record={record} />
              {detailed !== DetailedState.Open && (
                <div className="rules__row">
                  <dt>Voting</dt>
                  <dd className="mono">Not open</dd>
                </div>
              )}
            </dl>
            {onCast && (
              <Pill onClick={onCast} className="voter__action">
                Cast confidential vote
              </Pill>
            )}
            {onChangeVote && (
              <Pill onClick={onChangeVote} className="voter__action">
                Change vote
              </Pill>
            )}
          </>
        )
    }
  }

  return (
    <section className="card">
      <h2 className="card__title">Your standing</h2>
      {body()}
      <p className="card__note">{COPY.promise}</p>
    </section>
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
