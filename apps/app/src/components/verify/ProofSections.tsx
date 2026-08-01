import { Skeleton } from '../QueryBoundary.tsx'
import { EvidenceRow, EvidenceSection } from './EvidenceSection.tsx'
import { profile, type Hex } from '../../config/addresses.ts'
import type { BallotHistory } from '../../hooks/useBallotHistory.ts'
import { truncateHex } from '../../lib/format.ts'
import { Result, ZERO_HANDLE } from '../../state/chain.ts'
import type { ExecutionFacts } from '../../state/execution.ts'

export function TallyRequestSection({ history }: { history: BallotHistory | undefined }) {
  return (
    <EvidenceSection title="Tally request" provenance="onchain">
      {history?.tallyRequested ? (
        <dl className="rules">
          <EvidenceRow
            label="Expected verdict handle"
            value={truncateHex(history.tallyRequested.expectedVerdictHandle, 12, 10)}
          />
          <EvidenceRow label="Request tx" value={truncateHex(history.tallyRequested.txHash, 10, 8)} />
        </dl>
      ) : (
        <p className="card__body">No tally request yet — it opens when voting closes.</p>
      )}
    </EvidenceSection>
  )
}

export function VerdictProofSection({
  verdictHandle,
  acl,
  history,
  mismatch,
}: {
  verdictHandle: Hex | undefined
  acl: { publiclyDecryptable: boolean; coreAllowed: boolean } | undefined
  history: BallotHistory | undefined
  mismatch?: string
}) {
  return (
    <EvidenceSection title="Verdict proof" provenance="onchain" mismatch={mismatch}>
      {verdictHandle === undefined || verdictHandle === ZERO_HANDLE ? (
        <p className="card__body">No expected verdict handle is stored yet.</p>
      ) : (
        <dl className="rules">
          <EvidenceRow label="Handle" value={truncateHex(verdictHandle, 12, 10)} />
          <EvidenceRow
            label="Publicly decryptable"
            value={acl === undefined ? 'Checking…' : acl.publiclyDecryptable ? 'yes — verdict only' : 'no'}
          />
          <EvidenceRow
            label="Core-only access"
            value={acl === undefined ? 'Checking…' : acl.coreAllowed ? 'held by the core' : 'not held'}
          />
          {profile.kind !== 'unconfigured' && (
            <EvidenceRow label="Gateway signer" value={truncateHex(profile.nox.gatewaySigner)} />
          )}
          {history?.finalized && (
            <EvidenceRow label="Finalize tx" value={truncateHex(history.finalized.txHash, 10, 8)} />
          )}
        </dl>
      )}
      <p className="card__note">
        The proof shows the configured Gateway signed this plaintext for the stored expected
        handle. It does not prove the complete ballot-processing graph.
      </p>
    </EvidenceSection>
  )
}

export function ExecutionSection({
  execution,
  result,
  mismatch,
}: {
  execution: ExecutionFacts | undefined
  result: Result | undefined
  mismatch?: string
}) {
  return (
    <EvidenceSection title="Execution" provenance="onchain" mismatch={mismatch}>
      {execution === undefined ? (
        <Skeleton lines={2} />
      ) : execution.executed ? (
        <dl className="rules">
          <EvidenceRow label="Executed" value="once, against the committed action" />
          {execution.executionTx && (
            <EvidenceRow label="Execution tx" value={truncateHex(execution.executionTx, 10, 8)} />
          )}
        </dl>
      ) : (
        <p className="card__body">
          No execution.{' '}
          {result === Result.Passed
            ? 'The committed action is executable.'
            : 'Only a Passed result can execute.'}
        </p>
      )}
    </EvidenceSection>
  )
}
