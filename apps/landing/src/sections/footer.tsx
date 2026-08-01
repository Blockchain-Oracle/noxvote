import { APP_URL, DOCS_URL, Mark } from '@noxvote/ui'

const COLUMNS = [
  {
    head: 'Product',
    links: [
      { label: 'Launch the app', href: APP_URL },
      { label: 'How it works', href: '#orbit' },
      { label: 'Committed rules', href: '#rules' },
    ],
  },
  {
    head: 'Documentation',
    links: [
      { label: 'Overview', href: DOCS_URL },
      { label: 'Voter guide', href: `${DOCS_URL}/docs/voters` },
      { label: 'Integrator guides', href: `${DOCS_URL}/docs/integrate/deploy` },
      { label: 'Honest limits', href: `${DOCS_URL}/docs/limits` },
    ],
  },
  {
    head: 'Hosts',
    links: [
      { label: 'Safe 1.5.0', href: null },
      { label: 'OpenZeppelin Governor 5.6.1', href: null },
      { label: 'TimelockController', href: null },
    ],
  },
]

export function Footer() {
  return (
    <footer className="foot on-ink">
      <div className="wrap">
        <h2 className="foot__lede">Where private DAO lives.</h2>
        <div className="foot__grid">
          <div>
            <Mark />
            <p className="foot__note">
              Confidential governance voting on the released Nox stack.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.head}>
              <h4>{col.head}</h4>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? <a href={link.href}>{link.label}</a> : link.label}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="foot__legal">
          Wallets, weights, and timing are public; individual choices and exact totals are not
          disclosed. Only a pass or reject verdict is published, and only above the privacy
          floor. What is trusted &mdash; and what is not promised &mdash; is stated in full in
          the trust boundary above and in the documentation. The proposal shown on this page is
          fixture data, not a live ballot.
        </p>
      </div>
    </footer>
  )
}
