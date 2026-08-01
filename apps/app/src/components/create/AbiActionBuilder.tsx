import { useEffect, useMemo, useState } from 'react'
import { type AbiFunction, isAddress } from 'viem'
import { useContractAbi } from '../../hooks/useContractAbi.ts'
import { encodeCall, fnKey, writableFunctions } from '../../lib/encodeAction.ts'
import type { ProposalDraft } from '../../state/proposalForm.ts'

/**
 * Screen 4, ABI mode: paste a verified contract, pick a callable function, fill
 * typed arguments, and the calldata is encoded for you. Everything it produces
 * lands in the same `calldata`/`value` draft fields the raw path writes, so the
 * submit path is unchanged. Falls back to a clear "not verified" note when no
 * source is found — the editor keeps the Paste-calldata escape hatch.
 */
export function AbiActionBuilder({
  target,
  value,
  onChange,
}: {
  target: string
  value: string
  onChange: (patch: Partial<ProposalDraft>) => void
}) {
  const abiQuery = useContractAbi(target)
  const fns = useMemo(
    () => (abiQuery.data ? writableFunctions(abiQuery.data.abi) : []),
    [abiQuery.data],
  )
  const [selectedKey, setSelectedKey] = useState('')
  const [args, setArgs] = useState<string[]>([])

  // A new contract (or a cleared target) resets the picker.
  useEffect(() => {
    setSelectedKey('')
    setArgs([])
  }, [abiQuery.data])

  const fn = fns.find((f) => fnKey(f) === selectedKey)
  const result = fn ? encodeCall(fn, args) : null

  const push = (f: AbiFunction | undefined, nextArgs: string[]) => {
    if (!f) return onChange({ calldata: '0x' })
    const r = encodeCall(f, nextArgs)
    onChange({ calldata: 'data' in r ? r.data : '0x' })
  }

  const selectFn = (key: string) => {
    const f = fns.find((x) => fnKey(x) === key)
    const nextArgs = f ? f.inputs.map(() => '') : []
    setSelectedKey(key)
    setArgs(nextArgs)
    onChange({ value: f?.stateMutability === 'payable' ? value : '0' })
    push(f, nextArgs)
  }

  const setArg = (i: number, v: string) => {
    const next = args.map((a, j) => (j === i ? v : a))
    setArgs(next)
    push(fn, next)
  }

  if (!isAddress(target)) {
    return <p className="abi-status">Enter a valid contract address above to load its functions.</p>
  }
  if (abiQuery.isFetching) {
    return <p className="abi-status">Reading the contract’s verified interface…</p>
  }
  if (!abiQuery.data) {
    return (
      <p className="abi-status">
        No verified source on Etherscan or Sourcify for this address. Switch to <b>Paste calldata</b>{' '}
        to supply the call directly.
      </p>
    )
  }

  return (
    <div className="abi-build">
      <p className="abi-source">
        Verified via {abiQuery.data.source === 'etherscan' ? 'Etherscan' : 'Sourcify'}
        {abiQuery.data.name ? ` · ${abiQuery.data.name}` : ''} · {fns.length} callable function
        {fns.length === 1 ? '' : 's'}
      </p>
      <label className="create__field">
        <span className="create__label">Function</span>
        <select
          className="create__input mono abi-select"
          value={selectedKey}
          onChange={(e) => selectFn(e.target.value)}
        >
          <option value="">Select a function…</option>
          {fns.map((f) => (
            <option key={fnKey(f)} value={fnKey(f)}>
              {f.name}({f.inputs.map((i) => i.type).join(', ')})
              {f.stateMutability === 'payable' ? ' — payable' : ''}
            </option>
          ))}
        </select>
      </label>

      {fn && fn.inputs.length > 0 && (
        <div className="abi-args">
          {fn.inputs.map((input, i) => (
            <label className="create__field" key={`${input.name ?? ''}-${i}`}>
              <span className="create__label">
                {input.name || `arg ${i + 1}`} <span className="abi-type">{input.type}</span>
              </span>
              <input
                className="create__input mono"
                value={args[i] ?? ''}
                onChange={(e) => setArg(i, e.target.value)}
                placeholder={placeholder(input.type)}
              />
            </label>
          ))}
        </div>
      )}

      {fn?.stateMutability === 'payable' && (
        <label className="create__field">
          <span className="create__label">
            Value <span className="abi-type">wei · payable</span>
          </span>
          <input
            className="create__input mono"
            value={value}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="0"
          />
        </label>
      )}

      {fn && result && 'error' in result && <p className="abi-error">{result.error}</p>}
      {fn && result && 'data' in result && (
        <div className="abi-encoded">
          <span className="abi-encoded__label">Encoded calldata</span>
          <code className="abi-encoded__value mono">{result.data}</code>
        </div>
      )}
    </div>
  )
}

function placeholder(type: string): string {
  if (type === 'address') return '0x…'
  if (type === 'bool') return 'true / false'
  if (type.startsWith('uint') || type.startsWith('int')) return '0'
  if (type.endsWith('[]')) return 'a, b, c'
  if (type.startsWith('bytes')) return '0x…'
  return ''
}
