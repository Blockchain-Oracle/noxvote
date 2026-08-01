import { Link, useParams } from 'react-router'
import { Eyebrow } from '@noxvote/ui'
import { EvidenceRow, EvidenceSection } from '../components/verify/EvidenceSection.tsx'
import {
  ExecutionSection,
  TallyRequestSection,
  VerdictProofSection,
} from '../components/verify/ProofSections.tsx'
import { Skeleton } from '../components/QueryBoundary.tsx'
import { activeChain } from '../config/chains.ts'
import { profile, type Hex } from '../config/addresses.ts'
import { useBallotRecord, useBallotResult, useExpectedVerdictHandle } from '../hooks/useBallot.ts'
import { useBallotHistory } from '../hooks/useBallotHistory.ts'
import { useExecutionFacts } from '../hooks/useExecution.ts'
import { useHandleAcl } from '../hooks/useHandleAcl.ts'
import { useHost } from '../hooks/useHost.ts'
import { COPY } from '../lib/copy.ts'
import { formatWeight, truncateHex } from '../lib/format.ts'
import { Result, ZERO_HANDLE } from '../state/chain.ts'
import { detailPath } from './ProposalList.tsx'

/**
 * DEMO-CRITICAL C. Every section is a chain fact with declared provenance;
 * a mismatch anywhere turns prominent. Nothing decrypts here — the center
 * proves what is committed, recorded, withheld, and finalized.
 */
export function VerificationCenter() {
  const params = useParams()
  const core = params.core as Hex
  const ballotId = params.ballotId as Hex

  const record = useBallotRecord(core, ballotId)
  const result = useBallotResult(core, ballotId)
  const verdictHandle = useExpectedVerdictHandle(core, ballotId)
  const host = useHost(core)
  const history = useBallotHistory(core, ballotId)
  const acl = useHandleAcl(
    verdictHandle.data === ZERO_HANDLE ? undefined : verdictHandle.data,
    core,
  )
  const execution = useExecutionFacts(core, record.data, host.data, result.data)

  if (record.isPending) return <Skeleton lines={8} />
  if (!record.data) return null
  const rec = record.data

  const finalized = result.data === Result.Passed || result.data === Result.Rejected
  const proofMismatch =
    finalized && acl.data !== undefined && !acl.data.publiclyDecryptable
      ? 'The ballot is finalized but the expected verdict handle is not publicly decryptable — the finalize evidence cannot be re-checked. Inspect the finalize transaction.'
      : undefined
  const executionMismatch =
    execution.data?.executed && result.data !== undefined && result.data !== Result.Passed
      ? 'An execution exists although the final result is not Passed. This must never happen — inspect the host.'
      : undefined

  return (
    <>
      <p className="detail__back">
        <Link to={detailPath(core, ballotId)}>&larr; Proposal</Link>
      </p>
      <Eyebrow>Verification center</Eyebrow>
      <h1 className="d-lg list__title">Everything this ballot committed, in public</h1>
      <p className="lead muted list__lead">
        Wallets, weights, statuses, commitments, and the verdict proof are public. Choices and
        exact totals are not. {COPY.totalsNotDisclosed}.
      </p>
      {(proofMismatch || executionMismatch) && (
        <div className="outcome outcome--danger evidence__banner">
          <p className="outcome__verdict">Evidence mismatch</p>
          <p className="outcome__body">{proofMismatch ?? executionMismatch}</p>
        </div>
      )}
      <div className="evidence__grid">
        <EvidenceSection title="Identity" provenance="onchain">
          <dl className="rules">
            <EvidenceRow label="Network" value={`${activeChain.name} (${activeChain.id})`} />
            <EvidenceRow label="Ballot core" value={truncateHex(core, 10, 6)} />
            <EvidenceRow
              label="Host"
              value={
                host.data
                  ? `${host.data.kind === 'safe' ? 'Safe module' : host.data.kind === 'governor' ? 'Governor' : 'Host'} ${truncateHex(host.data.address, 10, 6)}`
                  : 'Resolving…'
              }
            />
            <EvidenceRow label="Ballot id" value={truncateHex(ballotId, 10, 8)} />
            <EvidenceRow label="Host proposal" value={truncateHex(rec.hostProposalId, 10, 8)} />
          </dl>
        </EvidenceSection>
        <EvidenceSection title="Commitments" provenance="onchain">
          <dl className="rules">
            <EvidenceRow label="Config hash" value={truncateHex(rec.configHash, 10, 8)} />
            <EvidenceRow label="Action hash" value={truncateHex(rec.actionHash, 10, 8)} />
            <EvidenceRow label="Clock-mode hash" value={truncateHex(rec.clockModeHash, 10, 8)} />
            <EvidenceRow
              label="Window"
              value={`${rec.voteStart.toLocaleString('en-US')} → ${rec.voteEnd.toLocaleString('en-US')} (host clock)`}
            />
            <EvidenceRow label="Privacy floor" value={String(rec.privacyFloor)} />
          </dl>
        </EvidenceSection>
        <EvidenceSection title="Eligibility" provenance="onchain">
          <dl className="rules">
            <EvidenceRow label="Strategy" value={strategyLabel(rec.eligibilityStrategy)} />
            <EvidenceRow label="Snapshot" value={rec.snapshot.toLocaleString('en-US')} />
          </dl>
        </EvidenceSection>
        <EvidenceSection title="Operation record" provenance="onchain">
          {history.data === undefined ? (
            <Skeleton lines={3} />
          ) : history.data.operations.length === 0 ? (
            <p className="card__body">No ballot operations yet.</p>
          ) : (
            <dl className="rules">
              {history.data.operations.map((op) => (
                <EvidenceRow
                  key={op.txHash + op.sequence.toString()}
                  label={`${truncateHex(op.voter)} · seq ${op.sequence.toString()}`}
                  value={`weight ${formatWeight(op.weight)}${op.replacement ? ' · replacement' : ''} · tx ${truncateHex(op.txHash, 8, 6)}`}
                />
              ))}
            </dl>
          )}
          <p className="card__note">Choices never appear here. {COPY.receiptLimit}.</p>
        </EvidenceSection>
        <EvidenceSection title="Participation and floor" provenance="onchain">
          <dl className="rules">
            <EvidenceRow
              label="Recorded"
              value={`${rec.recordedVoters} unique wallets · weight ${formatWeight(rec.recordedWeight)}`}
            />
            <EvidenceRow label="Privacy floor" value={String(rec.privacyFloor)} />
            {history.data?.tallyWithheld && (
              <EvidenceRow
                label={COPY.resultWithheld}
                value={`${history.data.tallyWithheld.recordedVoters} of ${history.data.tallyWithheld.privacyFloor} · tx ${truncateHex(history.data.tallyWithheld.txHash, 8, 6)}`}
              />
            )}
          </dl>
        </EvidenceSection>
        <TallyRequestSection history={history.data} />
        <VerdictProofSection
          verdictHandle={verdictHandle.data}
          acl={acl.data}
          history={history.data}
          mismatch={proofMismatch}
        />
        <ExecutionSection execution={execution.data} result={result.data} mismatch={executionMismatch} />
      </div>
    </>
  )
}

function strategyLabel(strategy: Hex): string {
  if (profile.kind !== 'unconfigured') {
    const c = profile.contracts
    if (strategy.toLowerCase() === c.merkleWeightedAllowlistStrategy?.toLowerCase()) {
      return `Weighted allowlist ${truncateHex(strategy)}`
    }
    if (strategy.toLowerCase() === c.ivotesSnapshotStrategy?.toLowerCase()) {
      return `Token snapshot ${truncateHex(strategy)}`
    }
  }
  return truncateHex(strategy, 10, 6)
}
