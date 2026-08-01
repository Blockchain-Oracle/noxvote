import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Eyebrow, Pill } from '@noxvote/ui'
import { useAccount, useConnect, useSwitchChain } from 'wagmi'
import { ProposalEditor } from '../components/create/ProposalEditor.tsx'
import { ConfigPanel } from '../components/create/ConfigPanel.tsx'
import { PublishReview } from '../components/create/PublishReview.tsx'
import { activeChain } from '../config/chains.ts'
import { profile } from '../config/addresses.ts'
import { useGovernanceQuorum } from '../hooks/useHost.ts'
import { useGovernorSettings } from '../hooks/useGovernorSettings.ts'
import {
  clearDraft,
  loadDraft,
  saveDraft,
  validateDraft,
  type ProposalDraft,
} from '../state/proposalForm.ts'
import { useProposeConfidential } from '../write/propose.ts'

type Step = 'edit' | 'configure' | 'publish'

/**
 * The author flow (screens 4-6). The Governor path wires first because
 * `proposeConfidential` is caller-open; the Safe path is `onlySafe`-gated, so
 * it is an owner-side registration handled as a decoded-calldata handoff (a
 * pointer here, not a faked in-app flow).
 */
export function Create() {
  const initial = useMemo(loadDraft, [])
  const [step, setStep] = useState<Step>('edit')
  const [draft, setDraft] = useState<ProposalDraft>(initial.draft)
  const [touched, setTouched] = useState(false)
  const restored = initial.restored && !touched

  useEffect(() => {
    saveDraft(draft)
  }, [draft])
  const { isConnected, chainId } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { switchChain } = useSwitchChain()

  const governor = profile.kind === 'sepolia' ? profile.contracts.governor : undefined
  const settings = useGovernorSettings()
  const quorum = useGovernanceQuorum(governor, '0x', 0)
  const proposer = useProposeConfidential(governor)

  const validation = useMemo(
    () => validateDraft(draft, { quorum: quorum.data }),
    [draft, quorum.data],
  )
  const patch = (p: Partial<ProposalDraft>) => {
    setTouched(true)
    setDraft((d) => ({ ...d, ...p }))
  }
  const wrongNetwork = isConnected && chainId !== activeChain.id

  return (
    <>
      <p className="detail__back">
        <Link to="/">&larr; All proposals</Link>
      </p>
      <Eyebrow>New confidential proposal</Eyebrow>
      <h1 className="d-lg list__title">Create a proposal</h1>
      <ol className="create__steps mono">
        <li className={step === 'edit' ? 'is-active' : undefined}>1 Proposal</li>
        <li className={step === 'configure' ? 'is-active' : undefined}>2 Configure</li>
        <li className={step === 'publish' ? 'is-active' : undefined}>3 Publish</li>
      </ol>

      {!governor ? (
        <div className="state-card">
          <p className="state-card__title">No Governor on this profile</p>
          <p className="state-card__body">
            The caller-open author flow targets the compatible Governor. The Safe path registers
            through the Safe itself (<span className="mono">onlySafe</span>) — its owners submit the
            decoded <span className="mono">registerProposal</span> call from their Safe, which this
            app cannot sign.
          </p>
        </div>
      ) : step === 'edit' ? (
        <ProposalEditor
          draft={draft}
          errors={touched || restored ? validation.errors : {}}
          restored={restored}
          onChange={patch}
          onNext={() => setStep('configure')}
        />
      ) : step === 'configure' ? (
        <ConfigPanel
          draft={draft}
          errors={validation.errors}
          quorumEqualsFloor={validation.quorumEqualsFloor}
          settings={settings.data}
          onChange={patch}
          onBack={() => setStep('edit')}
          onNext={() => setStep('publish')}
          canContinue={validation.valid}
        />
      ) : (
        <>
          {!isConnected && (
            <div className="install__banner">
              <span>Connect a wallet with voting weight to publish.</span>
              <Pill
                onClick={() => connectors[0] && connect({ connector: connectors[0] })}
                className="voter__action"
              >
                {isPending ? 'Connecting…' : 'Connect wallet'}
              </Pill>
            </div>
          )}
          {wrongNetwork && (
            <div className="install__banner install__banner--warn">
              <span>Switch to {activeChain.name} to publish on this Governor.</span>
              <Pill onClick={() => switchChain({ chainId: activeChain.id })} className="voter__action">
                Switch network
              </Pill>
            </div>
          )}
          <PublishReview
            draft={draft}
            canPublish={isConnected && !wrongNetwork}
            progress={proposer.progress}
            onBack={() => setStep('configure')}
            onPublish={() => proposer.publish(draft)}
            onPublished={clearDraft}
          />
        </>
      )}
    </>
  )
}
