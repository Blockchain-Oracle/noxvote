import { Nav } from './sections/nav.tsx'
import { Hero } from './sections/hero.tsx'
import { Problem } from './sections/problem.tsx'
import { OrbitBand } from './sections/orbit-band.tsx'
import { Rules } from './sections/rules.tsx'
import { Outcomes } from './sections/outcomes.tsx'
import { Limits } from './sections/limits.tsx'
import { Trust } from './sections/trust.tsx'
import { Cta } from './sections/cta.tsx'
import { Footer } from './sections/footer.tsx'

export default function App() {
  return (
    <>
      <Nav />
      <Hero />
      <main>
        <Problem />
        <OrbitBand />
        <Rules />
        <Outcomes />
        <Limits />
        <Trust />
        <Cta />
      </main>
      <Footer />
    </>
  )
}
