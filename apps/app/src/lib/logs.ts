import type { Abi, AbiEvent, Hex, Log, PublicClient } from 'viem'
import { profile } from '../config/addresses.ts'

/** First block worth scanning: the Sepolia deployment's own preflight block;
 * genesis for the local stack. */
function scanFromBlock(): bigint {
  return profile.kind === 'sepolia' ? 11_396_142n : 0n
}

/** Pull specific `event` ABI items out of a full contract ABI by name. */
export function eventsByName(abi: Abi, names: readonly string[]): AbiEvent[] {
  return abi.filter((item): item is AbiEvent => item.type === 'event' && names.includes(item.name))
}

/**
 * Topic-filtered `eth_getLogs`. Passing the event signatures makes the request
 * a targeted query public RPCs accept — an unfiltered "all logs for this
 * address" scan is what providers reject (403 / dropped CORS).
 */
export async function getEventLogs(
  client: PublicClient,
  address: Hex,
  events: AbiEvent[],
): Promise<Log[]> {
  return client.getLogs({
    address,
    events,
    fromBlock: scanFromBlock(),
    toBlock: 'latest',
  })
}
