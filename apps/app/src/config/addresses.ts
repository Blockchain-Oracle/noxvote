import checkpoint from '../../../../deployments/sepolia/phase6-live.json'

/**
 * THE chain-config module (SPEC R6). Every address the app touches resolves
 * here and only here — screens import the profile, never an address literal.
 *
 * Profile resolution, in order:
 *   1. `deployments/sepolia/phase6-live.json` with `status === "complete"` and
 *      `chainId === 11155111` → the live Sepolia profile (Phase 6 evidence).
 *   2. Otherwise, or when `VITE_CHAIN_PROFILE=local` forces it: the local
 *      Docker-stack profile from `deployments/local.json` or `VITE_LOCAL_*`.
 *   3. Otherwise: the honest `unconfigured` state. Never invented addresses.
 */

export type Hex = `0x${string}`

export type NoxDependencies = {
  computeAddress: Hex
  gatewaySigner: Hex
  gatewayUrl: string
  subgraphUrl: string
  proofExpirationSeconds: number
}

export type DeployedContracts = {
  factory: Hex
  safe: Hex
  safeModule: Hex
  safeCore: Hex
  ivotesSnapshotStrategy: Hex
  merkleWeightedAllowlistStrategy: Hex
  votesToken: Hex
  governor: Hex
  timelock: Hex
  governorCore: Hex
  safeExecutionTarget: Hex
  governorExecutionTarget: Hex
}

/** Finalized live ballots recorded by the Phase 6 runner — real records the
 * list/detail screens may open read-only; they are evidence, not fixtures. */
export type LiveProof = {
  ballotId: Hex
  verdictHandle: Hex
  verdict: boolean
}

export type ChainProfile =
  | {
      kind: 'sepolia'
      chainId: 11155111
      contracts: DeployedContracts
      nox: NoxDependencies
      voters: readonly Hex[]
      proofs: { safe: LiveProof & { proposalId: Hex }; governor: LiveProof & { proposalId: bigint } }
    }
  | {
      kind: 'local'
      chainId: number
      rpcUrl: string
      contracts: Partial<DeployedContracts> & { safeCore: Hex }
      nox: NoxDependencies
      /** Optional organizer-provided allowlist material for Merkle ballots:
       * voter address (lowercase) → fixed weight + sibling hashes. */
      eligibility?: Record<string, { weight: string; proof: Hex[] }>
      /** Optional organizer-provided Safe execution bundles:
       * safeProposalId (lowercase) → exact committed actions. */
      actions?: Record<string, Array<{ to: Hex; value: string; data: Hex }>>
    }
  | { kind: 'unconfigured'; reason: string }

function sepoliaProfile(): ChainProfile | null {
  if (checkpoint.status !== 'complete' || checkpoint.chainId !== 11155111) return null
  const deps = checkpoint.preflight.dependencies
  return {
    kind: 'sepolia',
    chainId: 11155111,
    contracts: checkpoint.contracts as DeployedContracts,
    nox: {
      computeAddress: deps.noxCompute as Hex,
      gatewaySigner: deps.noxGatewaySigner as Hex,
      gatewayUrl: deps.handleGatewayUrl,
      subgraphUrl: deps.subgraphUrl,
      proofExpirationSeconds: Number(deps.noxProofExpirationSeconds),
    },
    voters: checkpoint.voters as Hex[],
    proofs: {
      safe: {
        proposalId: checkpoint.safeProof.proposalId as Hex,
        ballotId: checkpoint.safeProof.ballotId as Hex,
        verdictHandle: checkpoint.safeProof.verdictHandle as Hex,
        verdict: checkpoint.safeProof.verdict,
      },
      governor: {
        proposalId: BigInt(checkpoint.governorProof.proposalId),
        ballotId: checkpoint.governorProof.ballotId as Hex,
        verdictHandle: checkpoint.governorProof.verdictHandle as Hex,
        verdict: checkpoint.governorProof.verdict,
      },
    },
  }
}

/** `deployments/local.json` is optional (a dev helper may emit it); the glob
 * resolves to an empty record when the file does not exist. */
const localJsonModules = import.meta.glob('../../../../deployments/local.json', { eager: true }) as
  Record<string, { default: LocalStackFile }>

type LocalStackFile = {
  chainId?: number
  rpcUrl?: string
  contracts?: Partial<DeployedContracts> & { safeCore?: Hex }
  dependencies?: {
    noxCompute?: Hex
    noxGatewaySigner?: Hex
    handleGatewayUrl?: string
    subgraphUrl?: string
    noxProofExpirationSeconds?: string | number
  }
  eligibility?: Record<string, { weight: string; proof: Hex[] }>
  actions?: Record<string, Array<{ to: Hex; value: string; data: Hex }>>
}

function localProfile(): ChainProfile {
  const file = Object.values(localJsonModules)[0]?.default
  const env = import.meta.env
  const core = file?.contracts?.safeCore ?? (env.VITE_LOCAL_CORE as Hex | undefined)
  const compute = file?.dependencies?.noxCompute ?? (env.VITE_LOCAL_NOX_COMPUTE as Hex | undefined)
  const gatewayUrl = file?.dependencies?.handleGatewayUrl ?? env.VITE_LOCAL_GATEWAY_URL
  const subgraphUrl = file?.dependencies?.subgraphUrl ?? env.VITE_LOCAL_SUBGRAPH_URL
  if (!core || !compute || !gatewayUrl || !subgraphUrl) {
    return {
      kind: 'unconfigured',
      reason:
        'No Sepolia checkpoint and no local stack configuration. Provide deployments/local.json ' +
        'or VITE_LOCAL_CORE, VITE_LOCAL_NOX_COMPUTE, VITE_LOCAL_GATEWAY_URL, and ' +
        'VITE_LOCAL_SUBGRAPH_URL from a running Docker Nox stack.',
    }
  }
  return {
    kind: 'local',
    chainId: file?.chainId ?? 31337,
    rpcUrl: file?.rpcUrl ?? env.VITE_LOCAL_RPC_URL ?? 'http://127.0.0.1:8545',
    contracts: { ...file?.contracts, safeCore: core },
    eligibility: file?.eligibility,
    actions: file?.actions,
    nox: {
      computeAddress: compute,
      gatewaySigner: (file?.dependencies?.noxGatewaySigner ?? '0x') as Hex,
      gatewayUrl,
      subgraphUrl,
      proofExpirationSeconds: Number(file?.dependencies?.noxProofExpirationSeconds ?? 3600),
    },
  }
}

function resolveProfile(): ChainProfile {
  if (import.meta.env.VITE_CHAIN_PROFILE === 'local') return localProfile()
  return sepoliaProfile() ?? localProfile()
}

export const profile: ChainProfile = resolveProfile()
