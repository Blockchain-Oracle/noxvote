import { Chip } from '@noxvote/ui'
import { profile } from '../../config/addresses.ts'
import { truncateHex } from '../../lib/format.ts'
import { Skeleton } from '../QueryBoundary.tsx'
import { useGovernorInstall } from '../../hooks/useInstall.ts'

/**
 * Screen 2 (Governor permission review) for the deployed Governor host.
 * Compatibility is read from the contract; the standard-client Pending gap is
 * stated plainly so a third-party UI's reading is never mistaken for ours.
 */
export function GovernorHostCard() {
  const query = useGovernorInstall()

  if (query.isPending) {
    return (
      <section className="card">
        <h2 className="card__title">Governor adapter</h2>
        <Skeleton lines={4} />
      </section>
    )
  }
  if (query.isError || !query.data) {
    const governor = profile.kind === 'sepolia' ? profile.contracts.governor : undefined
    return (
      <section className="card">
        <h2 className="card__title">Governor adapter</h2>
        <p className="card__body receipt__bad">The Governor could not be read on this network.</p>
        <dl className="rules">
          <div className="rules__row">
            <dt>Governor</dt>
            <dd className="mono">{governor ? truncateHex(governor, 10, 6) : '—'}</dd>
          </div>
        </dl>
      </section>
    )
  }

  const g = query.data
  return (
    <section className="card">
      <div className="evidence__head">
        <h2 className="card__title">Governor adapter</h2>
        <Chip state="passed">Compatible</Chip>
      </div>
      <dl className="rules">
        <div className="rules__row">
          <dt>Governor</dt>
          <dd className="mono">{truncateHex(g.governor, 10, 6)}</dd>
        </div>
        <div className="rules__row">
          <dt>Rules version</dt>
          <dd className="mono">{g.version}</dd>
        </div>
        <div className="rules__row">
          <dt>Bound core</dt>
          <dd className="mono">{truncateHex(g.core, 10, 6)}</dd>
        </div>
        <div className="rules__row">
          <dt>Timelock</dt>
          <dd className="mono">{truncateHex(g.timelock, 10, 6)}</dd>
        </div>
        <div className="rules__row">
          <dt>Vote token</dt>
          <dd className="mono">{truncateHex(g.token, 10, 6)}</dd>
        </div>
        <div className="rules__row">
          <dt>Clock</dt>
          <dd className="mono">{g.clockMode}</dd>
        </div>
      </dl>
      <p className="card__note">
        Voting weight is snapshotted at each proposal&rsquo;s start under this clock mode, so
        eligibility is fixed before anyone can vote. A passed confidential proposal queues through
        this timelock before it executes. After the deadline, standard Governor clients read the
        proposal as <span className="mono">Pending</span> during the Nox tally gap — NoxVote shows the
        detailed <span className="mono">Tally pending</span> state instead. All plaintext cast routes
        are disabled on this Governor.
      </p>
    </section>
  )
}
