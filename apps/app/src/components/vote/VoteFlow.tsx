import { useState } from 'react'
import { useAccount } from 'wagmi'
import type { Hex } from '../../config/addresses.ts'
import { activeChain } from '../../config/chains.ts'
import { firstCastEligibilityProof } from '../../lib/eligibility.ts'
import { useEligibilityWeight } from '../../hooks/useEligibility.ts'
import { useReceipt } from '../../hooks/useBallot.ts'
import type { BallotRecordView, DetailedState } from '../../state/chain.ts'
import type { VoterStanding } from '../../state/proposalDetail.ts'
import { voteDrawerState } from '../../state/voteDrawer.ts'
import { operationReceiptState } from '../../state/receipt.ts'
import { useCastVote } from '../../write/castVote.ts'
import { VoterCard } from '../detail/VoterCard.tsx'
import { VoteDrawer } from './VoteDrawer.tsx'
import { ProgressOverlay } from './ProgressOverlay.tsx'
import { ReceiptPanel } from './ReceiptPanel.tsx'
import { ChangeVoteConfirm, changeVoteState } from './ChangeVoteConfirm.tsx'

/**
 * Owns the voter write flow: standing assembly, the drawer, the five-stage
 * overlay, and the operation receipt. Everything renders from the pure
 * selectors — no screen branches on raw chain values.
 */
export function VoteFlow({
  core,
  ballotId,
  record,
  detailed,
  timestampClock,
}: {
  core: Hex
  ballotId: Hex
  record: BallotRecordView
  detailed: DetailedState
  timestampClock: boolean | undefined
}) {
  const { address, chainId, isConnected } = useAccount()
  const proof = firstCastEligibilityProof(address)
  const eligibility = useEligibilityWeight(core, ballotId, record, address, proof)
  const receipt = useReceipt(core, ballotId, address)

  const standing: VoterStanding = !isConnected || !address
    ? { kind: 'disconnected' }
    : chainId !== activeChain.id
      ? { kind: 'wrong-network', walletChainId: chainId ?? 0, expectedChainId: activeChain.id }
      : eligibility.isPending
        ? { kind: 'checking' }
        : eligibility.isError || eligibility.data === 0n
          ? { kind: 'ineligible', snapshot: record.snapshot }
          : { kind: 'eligible', weight: eligibility.data }

  const drawer = voteDrawerState(detailed, record, standing, receipt.data)
  const sequence = drawer.phase === 'ready' ? drawer.sequence : 1n
  const cast = useCastVote({
    core,
    ballotId,
    sequence,
    eligibilityProof: drawer.phase === 'ready' && drawer.replacement ? '0x' : proof,
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [changeOpen, setChangeOpen] = useState(false)

  const operation = operationReceiptState(cast.state, receipt.data)
  const castBusy =
    cast.state.stage !== 'idle' && cast.state.stage !== 'recorded' && cast.state.stage !== 'failed'
  const change = changeVoteState(drawer, castBusy, record.voteEnd, timestampClock ?? true)

  return (
    <>
      <VoterCard
        record={record}
        detailed={detailed}
        standing={standing}
        receipt={receipt.data}
        wallet={address}
        eligibilityNeedsProof={eligibility.isError}
        onCast={
          drawer.phase === 'ready' && !drawer.replacement ? () => setDrawerOpen(true) : undefined
        }
        onChangeVote={
          receipt.data?.recorded && drawer.phase !== 'disconnected'
            ? () => setChangeOpen(true)
            : undefined
        }
      />
      <ChangeVoteConfirm
        state={change}
        open={changeOpen}
        onClose={() => setChangeOpen(false)}
        onContinue={() => {
          setChangeOpen(false)
          setDrawerOpen(true)
        }}
      />
      <ReceiptPanel state={operation} ballotId={ballotId} wallet={address} />
      <VoteDrawer
        state={drawer}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onConfirm={(choice) => {
          setDrawerOpen(false)
          setOverlayOpen(true)
          cast.start(choice)
        }}
      />
      <ProgressOverlay
        cast={cast.state}
        startedAt={cast.startedAt}
        open={overlayOpen}
        onClose={() => setOverlayOpen(false)}
        onRetry={cast.retry}
      />
    </>
  )
}
