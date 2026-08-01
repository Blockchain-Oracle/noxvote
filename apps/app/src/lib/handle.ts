import { createViemHandleClient } from '@iexec-nox/handle'
import type { WalletClient } from 'viem'
import type { Hex, NoxDependencies } from '../config/addresses.ts'

/**
 * The released Handle SDK client, wired exactly as the passing integration
 * test wires it. The SDK derives the input owner from `getAddresses()[0]`
 * (documented released-SDK workaround), so the wallet is scoped to the one
 * connected account before it is handed over.
 */
export async function createHandleClient(wallet: WalletClient, account: Hex, nox: NoxDependencies) {
  const scoped = new Proxy(wallet, {
    get(target, property, receiver) {
      if (property === 'getAddresses') {
        return async () => [account]
      }
      return Reflect.get(target, property, receiver)
    },
  })
  return createViemHandleClient(scoped, {
    smartContractAddress: nox.computeAddress,
    gatewayUrl: nox.gatewayUrl as `https://${string}`,
    subgraphUrl: nox.subgraphUrl as `https://${string}`,
  })
}
