import { Chip } from '@noxvote/ui'
import type { ChipTone } from '../lib/lifecycle.ts'

/** Triad tones use the shared Chip (the triad's only home); every other
 * lifecycle label renders the neutral slate chip. */
export function LifecycleChip({ tone, children }: { tone: ChipTone; children: string }) {
  if (tone === 'neutral') return <span className="chip chip--plain">{children}</span>
  return <Chip state={tone}>{children}</Chip>
}
