/**
 * Cast confidential votes on an OPEN Governor ballot from the four pre-set
 * voters (already eligible + funded). Their keys derive deterministically from
 * the deployer key, exactly as the Phase-6 runner derives them, so this needs
 * PHASE6_DEPLOYER_PRIVATE_KEY in the environment and nothing else.
 *
 *   node --env-file-if-exists=.env scripts/cast-votes.ts [core] [ballotId]
 *
 * Fresh accounts cannot be used here: OZ Governor counts voting power at the
 * proposal snapshot, which is already in the past for an open ballot.
 */
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { createWalletClient, createPublicClient, http, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { createViemHandleClient } from '@iexec-nox/handle'

const RPC = process.env.PHASE6_SEPOLIA_RPC_URL ?? 'https://sepolia.drpc.org'
const CORE = (process.argv[2] ?? '0x2Be76a5ab935DB855aa8E1386847d9182064147d') as Hex
const BALLOT = (process.argv[3] ??
  '0x13b4a5757bdd59fecb44c84871182032b9901a34d2c463a45c13e5601b92b5b5') as Hex

const deployerKey = process.env.PHASE6_DEPLOYER_PRIVATE_KEY as Hex | undefined
assert.ok(deployerKey && deployerKey.length === 66, 'PHASE6_DEPLOYER_PRIVATE_KEY (0x + 64 hex) required')

const dep = JSON.parse(
  readFileSync(new URL('../deployments/sepolia/phase6-live.json', import.meta.url), 'utf8'),
).preflight.dependencies as { noxCompute: Hex; handleGatewayUrl: string; subgraphUrl: string }

const castVoteAbi = [
  {
    type: 'function',
    name: 'castVote',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'ballotId', type: 'bytes32' },
      { name: 'sequence', type: 'uint64' },
      { name: 'choice', type: 'bytes32' },
      { name: 'handleProof', type: 'bytes' },
      { name: 'eligibilityProof', type: 'bytes' },
    ],
    outputs: [],
  },
] as const

/** 1 = For, 0 = Against, 65535 = Abstain. A weighted majority For. */
const CHOICES = [1n, 1n, 1n, 0n]

function deriveVoter(index: number) {
  const digest = createHmac('sha256', Buffer.from(deployerKey!.slice(2), 'hex'))
    .update(`wtf-confidential-governance:sepolia:voter:${index}`)
    .digest('hex')
  return privateKeyToAccount(`0x${digest}`)
}

const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) })

console.log(`ballot ${BALLOT}\ncore   ${CORE}\n`)
for (let index = 0; index < 4; index++) {
  const account = deriveVoter(index)
  const label = `voter ${index} (${account.address})`
  try {
    const wallet = createWalletClient({ account, chain: sepolia, transport: http(RPC) })
    // Released SDK derives the input owner from getAddresses()[0]; scope it.
    const scoped = new Proxy(wallet, {
      get(target, property, receiver) {
        if (property === 'getAddresses') return async () => [account.address]
        return Reflect.get(target, property, receiver)
      },
    })
    const handleClient = await createViemHandleClient(scoped, {
      smartContractAddress: dep.noxCompute,
      gatewayUrl: dep.handleGatewayUrl as `https://${string}`,
      subgraphUrl: dep.subgraphUrl as `https://${string}`,
    })
    const { handle, handleProof } = await handleClient.encryptInput(CHOICES[index], 'uint16', CORE)
    const hash = await wallet.writeContract({
      address: CORE,
      abi: castVoteAbi,
      functionName: 'castVote',
      args: [BALLOT, 1n, handle, handleProof, '0x'],
    })
    console.log(`${label}: choice ${CHOICES[index]} → ${hash}`)
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 })
    console.log(`  ${receipt.status} (block ${receipt.blockNumber})`)
  } catch (error) {
    console.error(`${label}: FAILED — ${(error as Error).message?.slice(0, 200)}`)
  }
}
console.log('\ndone')
