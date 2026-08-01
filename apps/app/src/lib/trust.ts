/**
 * Screen 16's five stable sections, from the surface map's trust summary.
 * These sentences are the product's honest boundary — extend only from the
 * map, never ad hoc.
 */
export const TRUST_SECTIONS = [
  {
    title: 'Private from the public',
    body: 'Your choice and the exact option totals. They never appear on-chain and are never published.',
  },
  {
    title: 'Public',
    body: 'Your wallet, your fixed voting weight, participation time, and the fact of each replacement.',
  },
  {
    title: 'Trusted today',
    body: 'The Handle Gateway sees your encoded choice before encrypting it; the Nox TEE stack, its single-node KMS, the Gateway signer, and the deployed module code are trusted as released.',
  },
  {
    title: 'What the proof checks',
    body: 'That the configured Gateway signed this exact plaintext for the stored expected verdict handle, and that module state binds the proposal, type, and replay protection. It does not prove the complete ballot-processing graph.',
  },
  {
    title: 'Not promised',
    body: 'Encryption inside your browser, hiding who voted, receipt-freeness, protection from someone watching your screen, bribe-proof voting, or a full tally proof. Do not rely on any of these.',
  },
] as const
