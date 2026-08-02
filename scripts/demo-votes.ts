/**
 * One-shot live demo: from a single funded key (FAUCET_PRIVATE_KEY) create four
 * voters, give them delegated voting power, open a fresh confidential Governor
 * proposal, and cast four confidential votes on it — meeting the privacy floor
 * so the verdict reveals.
 *
 *   node --env-file=apps/app/.env.local scripts/demo-votes.ts
 *
 * A fresh proposal is required: OZ Governor counts power at the snapshot, so
 * newly-funded voters can only vote on a proposal created after they delegate.
 */
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  formatEther,
  encodeFunctionData,
  parseEventLogs,
  type Hex,
} from 'viem'
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { createViemHandleClient } from '@iexec-nox/handle'

const RPC = process.env.PHASE6_SEPOLIA_RPC_URL ?? 'https://sepolia.drpc.org'
const GOVERNOR = '0x061C799DC284b0Cd0501b442b8a4e262c31Ac12d' as Hex
const CORE = '0x2Be76a5ab935DB855aa8E1386847d9182064147d' as Hex
const TOKEN = '0xbeb6c66d19e329daf4f82cb71156867d054da5a5' as Hex
const TARGET = '0x84bf42da8517994923b05a084b85ff4b99fb06f8' as Hex

const funderKey = process.env.FAUCET_PRIVATE_KEY as Hex | undefined
assert.ok(funderKey && funderKey.length === 66, 'FAUCET_PRIVATE_KEY (0x + 64 hex) required')

const dep = JSON.parse(
  readFileSync(new URL('../deployments/sepolia/phase6-live.json', import.meta.url), 'utf8'),
).preflight.dependencies as { noxCompute: Hex; handleGatewayUrl: string; subgraphUrl: string }

const tokenAbi = [
  { type: 'function', name: 'mint', stateMutability: 'nonpayable', inputs: [{ name: 'account', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'delegate', stateMutability: 'nonpayable', inputs: [{ name: 'delegatee', type: 'address' }], outputs: [] },
] as const
const targetAbi = [
  { type: 'function', name: 'setValue', stateMutability: 'nonpayable', inputs: [{ name: 'v', type: 'uint256' }], outputs: [] },
] as const
const governorAbi = [
  { type: 'function', name: 'proposeConfidential', stateMutability: 'nonpayable', inputs: [{ name: 'targets', type: 'address[]' }, { name: 'values', type: 'uint256[]' }, { name: 'calldatas', type: 'bytes[]' }, { name: 'description', type: 'string' }, { name: 'privacyFloor', type: 'uint32' }], outputs: [{ name: 'proposalId', type: 'uint256' }, { name: 'ballotId', type: 'bytes32' }] },
  { type: 'function', name: 'proposalSnapshot', stateMutability: 'view', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'event', name: 'ConfidentialProposalLinked', inputs: [{ name: 'proposalId', type: 'uint256', indexed: true }, { name: 'ballotId', type: 'bytes32', indexed: true }] },
] as const
const coreAbi = [
  { type: 'function', name: 'castVote', stateMutability: 'nonpayable', inputs: [{ name: 'ballotId', type: 'bytes32' }, { name: 'sequence', type: 'uint64' }, { name: 'choice', type: 'bytes32' }, { name: 'handleProof', type: 'bytes' }, { name: 'eligibilityProof', type: 'bytes' }], outputs: [] },
] as const

const CHOICES = [1n, 1n, 1n, 0n] // For, For, For, Against — weighted majority For
const MINT_AMOUNT = 1000n * 10n ** 18n
const GAS_PER_VOTER = parseEther('0.008')

const pub = createPublicClient({ chain: sepolia, transport: http(RPC) })
const funder = privateKeyToAccount(funderKey)
const funderWallet = createWalletClient({ account: funder, chain: sepolia, transport: http(RPC) })

function deriveVoter(index: number): PrivateKeyAccount {
  const digest = createHmac('sha256', Buffer.from(funderKey!.slice(2), 'hex'))
    .update(`noxvote:demo:voter:${index}`)
    .digest('hex')
  return privateKeyToAccount(`0x${digest}`)
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const voters = [0, 1, 2, 3].map(deriveVoter)
  console.log('funder', funder.address, formatEther(await pub.getBalance({ address: funder.address })), 'ETH')
  voters.forEach((v, i) => console.log(`voter ${i}`, v.address))

  // 1+2. fund voters for gas, and mint each voting power — batched from the funder with explicit nonces.
  let nonce = await pub.getTransactionCount({ address: funder.address })
  const funderTxs: Hex[] = []
  for (const v of voters) {
    funderTxs.push(await funderWallet.sendTransaction({ to: v.address, value: GAS_PER_VOTER, nonce: nonce++ }))
  }
  for (const v of voters) {
    funderTxs.push(await funderWallet.writeContract({ address: TOKEN, abi: tokenAbi, functionName: 'mint', args: [v.address, MINT_AMOUNT], nonce: nonce++ }))
  }
  await Promise.all(funderTxs.map((hash) => pub.waitForTransactionReceipt({ hash })))
  console.log('✓ funded + minted')

  // 3. each voter self-delegates (activates voting power)
  const delegations = await Promise.all(
    voters.map((v) =>
      createWalletClient({ account: v, chain: sepolia, transport: http(RPC) }).writeContract({
        address: TOKEN, abi: tokenAbi, functionName: 'delegate', args: [v.address],
      }),
    ),
  )
  await Promise.all(delegations.map((hash) => pub.waitForTransactionReceipt({ hash })))
  console.log('✓ delegated')
  await wait(15_000) // let delegations settle into a past block

  // 4. open a fresh confidential proposal from the funder
  const actionData = encodeFunctionData({ abi: targetAbi, functionName: 'setValue', args: [99n] })
  const description = `NoxVote live demo — confidential vote (${new Date().toISOString()})`
  const proposeHash = await funderWallet.writeContract({
    address: GOVERNOR, abi: governorAbi, functionName: 'proposeConfidential',
    args: [[TARGET], [0n], [actionData], description, 4],
  })
  const proposeReceipt = await pub.waitForTransactionReceipt({ hash: proposeHash })
  const linked = parseEventLogs({ abi: governorAbi, eventName: 'ConfidentialProposalLinked', logs: proposeReceipt.logs })[0]
  const proposalId = linked.args.proposalId as bigint
  const ballotId = linked.args.ballotId as Hex
  console.log('✓ proposal opened  ballot', ballotId)

  // 5. wait until voting is open (current block strictly past the snapshot)
  const snapshot = await pub.readContract({ address: GOVERNOR, abi: governorAbi, functionName: 'proposalSnapshot', args: [proposalId] }) as bigint
  while ((await pub.getBlockNumber()) <= snapshot) await wait(6_000)
  console.log('✓ voting open')

  // 6. cast four confidential votes in parallel
  const results = await Promise.allSettled(
    voters.map(async (v, i) => {
      const wallet = createWalletClient({ account: v, chain: sepolia, transport: http(RPC) })
      const scoped = new Proxy(wallet, {
        get(t, p, r) { return p === 'getAddresses' ? async () => [v.address] : Reflect.get(t, p, r) },
      })
      const handleClient = await createViemHandleClient(scoped, {
        smartContractAddress: dep.noxCompute,
        gatewayUrl: dep.handleGatewayUrl as `https://${string}`,
        subgraphUrl: dep.subgraphUrl as `https://${string}`,
      })
      const { handle, handleProof } = await handleClient.encryptInput(CHOICES[i], 'uint16', CORE)
      const hash = await wallet.writeContract({ address: CORE, abi: coreAbi, functionName: 'castVote', args: [ballotId, 1n, handle, handleProof, '0x'] })
      const rc = await pub.waitForTransactionReceipt({ hash, timeout: 180_000 })
      return { i, choice: CHOICES[i], hash, status: rc.status }
    }),
  )
  results.forEach((r, i) => console.log(r.status === 'fulfilled' ? `✓ voter ${i} cast ${r.value.status} ${r.value.hash}` : `✗ voter ${i} ${r.reason?.message?.slice(0, 160)}`))

  console.log(`\nDONE → https://app.noxvote.xyz/b/${CORE}/${ballotId}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
