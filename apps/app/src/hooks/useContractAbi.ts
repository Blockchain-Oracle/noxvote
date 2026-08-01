import { useQuery } from '@tanstack/react-query'
import { isAddress } from 'viem'
import { fetchContractAbi, type AbiResult } from '../lib/abi.ts'

/** Verified-contract ABI for the Create function picker. Only runs once the
 * target is a syntactically valid address; a null result means "not verified",
 * not an error, so the flow degrades to raw calldata rather than blocking. */
export function useContractAbi(address: string) {
  return useQuery<AbiResult | null>({
    queryKey: ['contract-abi', address.toLowerCase()],
    enabled: isAddress(address),
    staleTime: Infinity,
    retry: false,
    queryFn: () => fetchContractAbi(address),
  })
}
