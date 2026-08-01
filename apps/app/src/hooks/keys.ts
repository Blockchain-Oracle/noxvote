import type { Hex } from '../config/addresses.ts'

/** Centralized query keys: event invalidation targets one ballot subtree. */
export const ballotKeys = {
  core: (chainId: number, core: Hex) => ['core', chainId, core] as const,
  registered: (chainId: number, core: Hex) =>
    [...ballotKeys.core(chainId, core), 'registered'] as const,
  ballot: (chainId: number, core: Hex, ballotId: Hex) =>
    [...ballotKeys.core(chainId, core), 'ballot', ballotId] as const,
  record: (chainId: number, core: Hex, ballotId: Hex) =>
    [...ballotKeys.ballot(chainId, core, ballotId), 'record'] as const,
  detailed: (chainId: number, core: Hex, ballotId: Hex) =>
    [...ballotKeys.ballot(chainId, core, ballotId), 'detailed'] as const,
  result: (chainId: number, core: Hex, ballotId: Hex) =>
    [...ballotKeys.ballot(chainId, core, ballotId), 'result'] as const,
  verdictHandle: (chainId: number, core: Hex, ballotId: Hex) =>
    [...ballotKeys.ballot(chainId, core, ballotId), 'verdictHandle'] as const,
  receipt: (chainId: number, core: Hex, ballotId: Hex, voter: Hex) =>
    [...ballotKeys.ballot(chainId, core, ballotId), 'receipt', voter] as const,
  eligibility: (chainId: number, core: Hex, ballotId: Hex, voter: Hex) =>
    [...ballotKeys.ballot(chainId, core, ballotId), 'eligibility', voter] as const,
}

export const aclKeys = {
  handle: (chainId: number, compute: Hex, handle: Hex) =>
    ['acl', chainId, compute, handle] as const,
}
