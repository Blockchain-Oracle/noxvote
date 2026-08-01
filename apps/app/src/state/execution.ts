import type { Hex } from '../config/addresses.ts'

/** A committed action, decoded where the chain provides the data (Governor
 * ProposalCreated logs, or organizer-provided Safe material). */
export type CommittedAction = { to: Hex; value: bigint; data: Hex }

export type ExecutionProgress =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'failed'; reason: string }
  | { status: 'mismatch'; detail: string }
  | { status: 'confirmed'; txHash: Hex }

export type ExecutionFacts = {
  /** The core's final result is Passed. */
  passed: boolean
  hostKind: 'safe' | 'governor' | 'unknown'
  /** Safe: module record's executed flag. Governor: ProposalExecuted seen. */
  executed: boolean
  executor?: Hex
  executionTx?: Hex
  /** Governor only. */
  needsQueuing?: boolean
  queued?: boolean
  /** Unix seconds when the timelock opens execution; 0 = not queued. */
  eta?: number
  /** The exact committed actions, when recoverable. */
  actions: CommittedAction[] | null
  actionHash: Hex
}

/**
 * Screen 14's machine. `ready` without action data stays honest: the
 * commitment renders, the submit affordance does not.
 */
export type ExecutionState =
  | { phase: 'unavailable' }
  | { phase: 'waiting-timelock'; eta: number; queued: boolean }
  | { phase: 'ready'; actions: CommittedAction[] | null; actionHash: Hex; queue: boolean }
  | { phase: 'submitting' }
  | { phase: 'executed'; executor?: Hex; txHash?: Hex }
  | { phase: 'failed'; reason: string }
  | { phase: 'mismatch'; detail: string }

export function executionState(
  facts: ExecutionFacts | undefined,
  progress: ExecutionProgress,
): ExecutionState | { phase: 'loading' } {
  if (facts === undefined) return { phase: 'loading' }
  if (facts.executed) {
    return { phase: 'executed', executor: facts.executor, txHash: facts.executionTx }
  }
  if (!facts.passed) return { phase: 'unavailable' }
  if (progress.status === 'submitting') return { phase: 'submitting' }
  if (progress.status === 'mismatch') return { phase: 'mismatch', detail: progress.detail }
  if (progress.status === 'failed') return { phase: 'failed', reason: progress.reason }

  if (facts.hostKind === 'governor') {
    if (facts.needsQueuing && !facts.queued) {
      return { phase: 'ready', actions: facts.actions, actionHash: facts.actionHash, queue: true }
    }
    const now = Date.now() / 1000
    if (facts.queued && facts.eta !== undefined && facts.eta > now) {
      return { phase: 'waiting-timelock', eta: facts.eta, queued: true }
    }
  }
  return { phase: 'ready', actions: facts.actions, actionHash: facts.actionHash, queue: false }
}
