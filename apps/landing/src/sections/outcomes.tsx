import { Chip, Eyebrow } from '@noxvote/ui'

export function Outcomes() {
  return (
    <section className="band" id="outcomes">
      <div className="wrap">
        <div className="band__intro">
          <Eyebrow>Two outcomes</Eyebrow>
          <h2 className="d-lg">Only one of these ever reaches the public record.</h2>
        </div>
        <div className="outcomes">
          <article className="outcome outcome--passed">
            <p className="outcome__cond">if recorded wallets &ge; privacy floor</p>
            <h3>The verdict is published. Nothing else is.</h3>
            <p>
              Passed or Rejected &mdash; never the choices, never the exact totals. A Passed
              verdict authorizes the one action committed when the record opened, and no other.
            </p>
            <div className="outcome__foot">
              <Chip state="passed">Passed</Chip>
              <span className="mono">&rarr; 1,000 USDC to 0xD0c3&hellip;3e91</span>
            </div>
          </article>
          <article className="outcome outcome--withheld">
            <p className="outcome__cond">if recorded wallets &lt; privacy floor</p>
            <h3>Result withheld.</h3>
            <p>
              Below the floor, too few wallets took part for any disclosure to be safe, so there
              is none. No verdict, no totals, no manual release, and nothing executes. This is a
              designed outcome, not a failure.
            </p>
            <div className="outcome__foot">
              <Chip state="withheld">Result withheld</Chip>
              <span className="mono">3 of 4 recorded</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
