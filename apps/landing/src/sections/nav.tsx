import { APP_URL, DOCS_URL, Mark, Pill } from '@noxvote/ui'

export function Nav() {
  return (
    <div className="navbar">
      <nav className="nav" aria-label="Primary">
        <Mark />
        <div className="nav__links">
          <a href="#orbit">How it works</a>
          <a href={DOCS_URL}>Docs</a>
        </div>
        <Pill className="nav__cta" href={APP_URL}>
          Launch app
        </Pill>
      </nav>
    </div>
  )
}
