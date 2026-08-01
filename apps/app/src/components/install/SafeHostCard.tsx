import { encodeFunctionData, parseAbi } from 'viem'
import { Chip } from '@noxvote/ui'
import { profile } from '../../config/addresses.ts'
import { truncateHex } from '../../lib/format.ts'
import { Skeleton } from '../QueryBoundary.tsx'
import { useSafeInstall } from '../../hooks/useInstall.ts'
import { installVerificationState } from '../../state/install.ts'

const enableModuleData = (module: `0x${string}`) =>
  encodeFunctionData({
    abi: parseAbi(['function enableModule(address module)']),
    functionName: 'enableModule',
    args: [module],
  })

/**
 * Screen 2 (Safe permission review) + screen 3 (installation verification)
 * for the deployed Safe host. Authority is decoded and exact; enablement is
 * read, never asserted. Enabling on a fresh Safe is an owner-threshold
 * transaction the app cannot sign — it hands over the decoded calldata.
 */
export function SafeHostCard() {
  const query = useSafeInstall()
  const state = installVerificationState(query.data, query.isPending, query.isError)

  if (state.phase === 'verifying') {
    return (
      <section className="card">
        <h2 className="card__title">Safe adapter</h2>
        <Skeleton lines={4} />
      </section>
    )
  }
  if (state.phase === 'unverified') {
    // Addresses come from configuration, not the failed reads — always show
    // them (map: verification must display host + adapter even if reads fail).
    const module = profile.kind === 'unconfigured' ? undefined : profile.contracts.safeModule
    const safe = profile.kind === 'unconfigured' ? undefined : profile.contracts.safe
    return (
      <section className="card">
        <h2 className="card__title">Safe adapter</h2>
        <p className="card__body receipt__bad">{state.reason}</p>
        <dl className="rules">
          <Row label="Adapter (module)" value={module ? truncateHex(module, 10, 6) : '—'} />
          <Row label="Safe" value={safe ? truncateHex(safe, 10, 6) : '—'} />
        </dl>
      </section>
    )
  }

  const install = state.install
  return (
    <section className={state.phase === 'mismatch' ? 'card evidence--mismatch' : 'card'}>
      <div className="evidence__head">
        <h2 className="card__title">Safe adapter</h2>
        {statusChip(state.phase)}
      </div>
      {state.phase === 'mismatch' && (
        <>
          <p className="evidence__mismatch">{state.detail}</p>
          <p className="card__body mono install__boundsafe">
            module is bound to {truncateHex(install.boundSafe, 10, 6)}
          </p>
        </>
      )}
      {state.phase === 'removed' && (
        <p className="card__body install__removed">
          The module is not enabled on this Safe. No confidential proposal can execute until an owner
          re-enables it.
        </p>
      )}
      <dl className="rules">
        <Row label="Adapter (module)" value={truncateHex(install.module, 10, 6)} />
        <Row label="Safe" value={truncateHex(install.safe, 10, 6)} />
        <Row label="Bound core" value={truncateHex(install.core, 10, 6)} />
        <Row label="Owner threshold" value={`${install.threshold} of ${install.ownerCount}`} />
        <Row label="Execution constraint" value="Only the exact committed action, once" />
        <Row label="Enabled on Safe" value={install.moduleEnabled ? 'yes' : 'no'} />
      </dl>
      <p className="card__note install__warning">
        This module holds full execution authority on the Safe: once enabled, any wallet may execute a
        Passed proposal&rsquo;s committed action through it. It can execute nothing else, and only once
        per proposal.
      </p>
      <details className="install__handoff">
        <summary>Enable on another Safe</summary>
        <p className="card__body">
          The Safe owners execute this call themselves — registration and enabling are{' '}
          <span className="mono">onlySafe</span>-gated, so this app cannot sign it.
        </p>
        <p className="mono install__calldata">
          to {truncateHex(install.safe, 10, 6)} · enableModule({truncateHex(install.module, 10, 6)})
          <br />
          data {truncateHex(enableModuleData(install.module), 12, 8)}
        </p>
      </details>
    </section>
  )
}

function statusChip(phase: 'verified' | 'mismatch' | 'removed') {
  if (phase === 'verified') return <Chip state="passed">Verified</Chip>
  if (phase === 'removed') return <span className="chip chip--plain">Disabled</span>
  return <span className="chip chip--danger">Mismatch</span>
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rules__row">
      <dt>{label}</dt>
      <dd className="mono">{value}</dd>
    </div>
  )
}
