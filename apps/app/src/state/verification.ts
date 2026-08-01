/**
 * Provenance tag for verification-center evidence: direct on-chain facts stay
 * visually distinguishable from indexer enrichment (partial-indexer honesty).
 * Consumed by EvidenceSection and the indexed re-check block.
 */
export type Provenance = 'onchain' | 'indexed'
