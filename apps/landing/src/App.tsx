import { Nav } from './sections/nav.tsx'
import { Hero } from './sections/hero.tsx'
import { OrbitBand } from './sections/orbit-band.tsx'
import { Faq } from './sections/faq.tsx'
import { Cta } from './sections/cta.tsx'
import { Footer } from './sections/footer.tsx'

export default function App() {
  return (
    <>
      <Nav />
      <Hero />
      <main>
        <OrbitBand />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  )
}
