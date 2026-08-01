import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import { APP_URL, BRAND, LANDING_URL, MarkGlyph } from '@noxvote/ui'

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <MarkGlyph />
          <span style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>{BRAND}</span>
        </>
      ),
    },
    links: [
      { text: 'Launch app', url: APP_URL, external: true },
      { text: 'noxvote.xyz', url: LANDING_URL, external: true },
    ],
    themeSwitch: { enabled: false },
  }
}
