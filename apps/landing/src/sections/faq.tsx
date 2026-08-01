import { APP_URL, DOCS_URL, Eyebrow } from '@noxvote/ui'
import type { ReactNode } from 'react'

const FAQS: Array<{ q: string; a: ReactNode }> = [
  {
    q: 'How does confidential voting work?',
    a: (
      <>
        The proposal, rules, and exact action are committed up front. Members submit encrypted
        ballots through the Nox Handle Gateway — the choice never goes on-chain in the clear. When
        voting closes, Nox returns one Passed or Rejected verdict and the committed action executes.{' '}
        <a href={`${DOCS_URL}/docs/how-it-works`}>Read how it works →</a>
      </>
    ),
  },
  {
    q: 'Do I have to move my DAO?',
    a: (
      <>
        No. NoxVote plugs into the Safe or OpenZeppelin Governor you already run. Your treasury,
        rules, and Timelock stay exactly where they are.
      </>
    ),
  },
  {
    q: 'What stays public, and what stays private?',
    a: (
      <>
        Public: your wallet, your voting weight, and that you took part. Private: your choice, the
        running leader, and the exact For / Against / Abstain totals.
      </>
    ),
  },
  {
    q: 'Is it live?',
    a: (
      <>
        Yes — the full stack is deployed and verified on Ethereum Sepolia, with both the Safe and
        Governor paths proven end to end.{' '}
        <a href={`${DOCS_URL}/docs/addresses`}>See the addresses →</a>
      </>
    ),
  },
  {
    q: 'What does NoxVote not promise?',
    a: (
      <>
        It is confidentiality, not anonymity, and it runs on a TEE — not ZK or FHE. The full trust
        boundary is stated plainly. <a href={`${DOCS_URL}/docs/limits`}>Read the limits →</a>
      </>
    ),
  },
  {
    q: 'Where do I start?',
    a: (
      <>
        Launch the app to create a proposal, or read the integration guides.{' '}
        <a href={APP_URL}>Launch the app →</a>
      </>
    ),
  },
]

export function Faq() {
  return (
    <section className="band band--lifted" id="faq">
      <div className="wrap">
        <div className="band__intro">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="d-lg">Questions, answered.</h2>
        </div>
        <div className="faq__list">
          {FAQS.map((item) => (
            <details key={item.q} className="faq__item">
              <summary className="faq__q">
                <span>{item.q}</span>
                <span className="faq__icon" aria-hidden="true" />
              </summary>
              <div className="faq__a">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
