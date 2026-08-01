import { parseAbi } from 'viem'

/** The two NoxCompute ACL reads the verification center needs (same shape the
 * integration test asserts): confidential handles stay core-only, and exactly
 * the expected verdict handle becomes publicly decryptable. */
export const noxAclAbi = parseAbi([
  'function isAllowed(bytes32 handle, address account) view returns (bool)',
  'function isPubliclyDecryptable(bytes32 handle) view returns (bool)',
])
