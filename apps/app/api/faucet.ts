import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  isAddress,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

/**
 * Sepolia test-ETH faucet. Runs server-side only so the funding key never
 * reaches the client bundle. Configure via env:
 *   FAUCET_PRIVATE_KEY  (required) — a low-value key that holds Sepolia ETH
 *   FAUCET_RPC_URL      (optional) — defaults to the public dRPC endpoint
 *
 * Guards: POST only, valid address, and it only funds wallets already below
 * RECIPIENT_MAX (so the same address can't be drained repeatedly). The faucet
 * balance is checked before sending. There is no persistent per-IP rate limit
 * — keep the funding key low-value and rotate it if abused.
 */
const AMOUNT = parseEther('0.02')
const RECIPIENT_MAX = parseEther('0.03')
const RPC = process.env.FAUCET_RPC_URL || 'https://sepolia.drpc.org'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }
  const rawKey = process.env.FAUCET_PRIVATE_KEY
  if (!rawKey) {
    res.status(503).json({ error: 'faucet_not_configured' })
    return
  }
  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body
  const address = body?.address
  if (!isAddress(address)) {
    res.status(400).json({ error: 'invalid_address' })
    return
  }
  try {
    const key = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`
    const account = privateKeyToAccount(key)
    const pub = createPublicClient({ chain: sepolia, transport: http(RPC) })
    const [recipientBal, faucetBal] = await Promise.all([
      pub.getBalance({ address }),
      pub.getBalance({ address: account.address }),
    ])
    if (recipientBal >= RECIPIENT_MAX) {
      res.status(400).json({ error: 'already_funded', balance: formatEther(recipientBal) })
      return
    }
    if (faucetBal < AMOUNT) {
      res.status(503).json({ error: 'faucet_empty' })
      return
    }
    const wallet = createWalletClient({ account, chain: sepolia, transport: http(RPC) })
    const hash = await wallet.sendTransaction({ to: address, value: AMOUNT })
    res.status(200).json({ hash, amount: formatEther(AMOUNT) })
  } catch (e: any) {
    res.status(500).json({ error: 'send_failed', detail: String(e?.shortMessage || e?.message || e) })
  }
}

function safeParse(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return undefined
  }
}
