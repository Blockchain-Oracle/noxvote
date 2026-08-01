import { HomeLayout } from 'fumadocs-ui/layouts/home'
import { Link } from 'react-router'
import { baseOptions } from '@/lib/layout.shared'

const CARDS = [
  {
    title: 'Quick start',
    body: 'Run the full confidential ballot on the released local Nox stack.',
    to: '/docs/quickstart',
  },
  {
    title: 'How it works',
    body: 'Five lifecycle stages, what is public at each, and the verdict-only reveal.',
    to: '/docs/how-it-works',
  },
  {
    title: 'Architecture',
    body: 'The immutable contract stack: core, strategies, Safe module, Governor, factory.',
    to: '/docs/architecture',
  },
  {
    title: 'Integrate',
    body: 'Deploy through the versioned factory and wire your Safe or Governor.',
    to: '/docs/integrate/deploy',
  },
  {
    title: 'Verify a result',
    body: 'What the decryption proof checks, what module state binds, and what to inspect.',
    to: '/docs/verification',
  },
  {
    title: 'Honest limits',
    body: 'What NoxVote deliberately does not promise, stated in full.',
    to: '/docs/limits',
  },
]

export default function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <title>NoxVote Docs — Participation in public. Choice in private.</title>
      <main className="flex-1 px-6 pb-24">
        <div className="mx-auto w-full max-w-5xl pt-20">
          <p className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-[0.04em]">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ background: 'var(--ember)' }}
            />
            Documentation
          </p>
          <h1 className="mt-4 max-w-[24ch] text-4xl md:text-5xl leading-[1.05]">
            Your wallet and participation are public; your choice is private.
          </h1>
          <p className="mt-5 max-w-[58ch] text-lg text-fd-muted-foreground">
            NoxVote is a host-neutral confidential ballot core for Safe and OpenZeppelin Governor
            on the released Nox stack. These docs explain the mechanism, the trust boundary, and
            exactly how to integrate, vote, and verify.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CARDS.map((card) => (
              <Link
                key={card.to}
                to={card.to}
                className="group rounded-3xl border border-fd-border bg-fd-card p-6 no-underline transition-transform duration-200 hover:-translate-y-0.5"
              >
                <span className="flex items-baseline justify-between font-medium text-fd-foreground">
                  {card.title}
                  <span
                    aria-hidden
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  >
                    &rarr;
                  </span>
                </span>
                <span className="mt-2 block text-sm text-fd-muted-foreground">{card.body}</span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </HomeLayout>
  )
}
