import { type Abi, type AbiFunction, type Hex, encodeFunctionData, getAddress } from 'viem'

/** Writable (state-changing) functions — the only ones a proposal can call. */
export function writableFunctions(abi: Abi): AbiFunction[] {
  return abi.filter(
    (item): item is AbiFunction =>
      item.type === 'function' &&
      (item.stateMutability === 'nonpayable' || item.stateMutability === 'payable'),
  )
}

/** Stable identity for a function — includes input types so overloads differ. */
export function fnKey(fn: AbiFunction): string {
  return `${fn.name}(${fn.inputs.map((i) => i.type).join(',')})`
}

/** Encode a call from the user's per-argument string inputs, coercing each to
 * the ABI type. Returns a message instead of throwing so the editor can show it
 * inline and keep the raw-calldata escape hatch available. */
export function encodeCall(fn: AbiFunction, rawArgs: string[]): { data: Hex } | { error: string } {
  try {
    const args = fn.inputs.map((input, i) => coerce(input.type, rawArgs[i] ?? ''))
    return { data: encodeFunctionData({ abi: [fn], functionName: fn.name, args }) }
  } catch (e) {
    return { error: e instanceof Error ? e.message.split('\n')[0] : String(e) }
  }
}

function coerce(type: string, raw: string): unknown {
  const v = raw.trim()
  if (type.endsWith('[]')) {
    const inner = type.slice(0, -2)
    if (v === '') return []
    return splitList(v).map((item) => coerce(inner, item))
  }
  if (type === 'bool') {
    if (v === 'true' || v === '1') return true
    if (v === 'false' || v === '0' || v === '') return false
    throw new Error(`Expected true or false for a bool, got "${v}".`)
  }
  if (type === 'address') return getAddress(v)
  if (type.startsWith('uint') || type.startsWith('int')) {
    if (!/^-?\d+$/.test(v)) throw new Error(`Expected a whole number for ${type}, got "${v}".`)
    return BigInt(v)
  }
  if (type === 'string') return v
  if (type === 'bytes' || /^bytes\d+$/.test(type)) {
    if (!/^0x[0-9a-fA-F]*$/.test(v)) throw new Error(`Expected 0x-prefixed hex for ${type}.`)
    return v as Hex
  }
  throw new Error(`Type "${type}" isn't supported in the builder — use Paste calldata.`)
}

/** Shallow comma-split for array inputs (tuple arrays aren't supported). */
function splitList(v: string): string[] {
  return v
    .replace(/^\s*\[|\]\s*$/g, '')
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
}
