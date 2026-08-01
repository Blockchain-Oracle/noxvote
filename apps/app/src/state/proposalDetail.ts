/** What the connected wallet knows about its own standing on this ballot.
 * Consumed by the vote-drawer projection and the voter card. */
export type VoterStanding =
  | { kind: 'disconnected' }
  | { kind: 'wrong-network'; walletChainId: number; expectedChainId: number }
  | { kind: 'checking' }
  | { kind: 'ineligible'; snapshot: number }
  | { kind: 'eligible'; weight: bigint }
