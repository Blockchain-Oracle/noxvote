import type { Hex } from '../config/addresses.ts'

/** The contract's absolute minimum (ConfidentialGovernanceVersion.ABSOLUTE_MINIMUM_PRIVACY_FLOOR).
 * A floor below this reverts InvalidPrivacyFloor when registerBallot runs, so the
 * form must refuse it up front. */
export const MIN_PRIVACY_FLOOR = 4

/** What the author actually controls on `proposeConfidential`; everything else
 * (snapshot timing, replacement ceiling, quorum, choices) is the Governor's
 * immutable setting, shown read-only. */
export type ProposalDraft = {
  target: string
  value: string
  calldata: string
  description: string
  privacyFloor: string
}

export const EMPTY_DRAFT: ProposalDraft = {
  target: '',
  value: '0',
  calldata: '0x',
  description: '',
  privacyFloor: '',
}

const DRAFT_KEY = 'noxvote:proposal-draft'

/** Persist the in-progress draft so a reload restores it (the surface map's
 * "restored draft" state). Session-scoped; cleared on publish. */
export function loadDraft(): { draft: ProposalDraft; restored: boolean } {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return { draft: EMPTY_DRAFT, restored: false }
    const parsed = JSON.parse(raw) as Partial<ProposalDraft>
    const draft = { ...EMPTY_DRAFT, ...parsed }
    const restored = JSON.stringify(draft) !== JSON.stringify(EMPTY_DRAFT)
    return { draft, restored }
  } catch {
    return { draft: EMPTY_DRAFT, restored: false }
  }
}

export function saveDraft(draft: ProposalDraft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    /* storage unavailable — the flow still works, just without persistence */
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

export type FieldErrors = Partial<Record<keyof ProposalDraft, string>>

/**
 * Screen 5's seven product-specific validations, restricted to the fields the
 * Governor path leaves to the author. Snapshot mutability, deadline length,
 * and replacement-limit validity are the Governor's immutable settings, so
 * they cannot be mis-entered here; the remaining classes are checked.
 * `quorumEqualsFloor` is not an error — it is the semantic warning the map
 * requires when the two numbers happen to coincide.
 */
export function validateDraft(
  draft: ProposalDraft,
  opts: { quorum?: bigint; eligiblePopulation?: number },
): { errors: FieldErrors; quorumEqualsFloor: boolean; valid: boolean } {
  const errors: FieldErrors = {}

  if (!isAddress(draft.target)) {
    errors.target = 'Enter the target contract address (0x…, 20 bytes).'
  }
  if (!/^\d+$/.test(draft.value.trim())) {
    errors.value = 'Value must be a whole number of wei (0 for none).'
  }
  if (!/^0x([0-9a-fA-F]{2})*$/.test(draft.calldata.trim())) {
    errors.calldata = 'Calldata must be 0x-prefixed, even-length hex (0x for an empty call).'
  }
  if (draft.description.trim().length === 0) {
    errors.description = 'A public proposal description is required.'
  }

  const floor = Number(draft.privacyFloor)
  if (draft.privacyFloor.trim() === '' || !Number.isInteger(floor)) {
    errors.privacyFloor = 'Set the privacy floor — the minimum unique wallets before any reveal.'
  } else if (floor < MIN_PRIVACY_FLOOR) {
    errors.privacyFloor = `The privacy floor must be at least ${MIN_PRIVACY_FLOOR}.`
  } else if (opts.eligiblePopulation !== undefined && floor > opts.eligiblePopulation) {
    errors.privacyFloor = `The floor cannot exceed the eligible population (${opts.eligiblePopulation}).`
  }

  const quorumEqualsFloor =
    opts.quorum !== undefined && errors.privacyFloor === undefined && BigInt(floor) === opts.quorum

  return { errors, quorumEqualsFloor, valid: Object.keys(errors).length === 0 }
}

export function draftToArgs(draft: ProposalDraft): {
  targets: Hex[]
  values: bigint[]
  calldatas: Hex[]
  description: string
  privacyFloor: number
} {
  // Trim to match what validateDraft checked, so a stray space never turns a
  // validated draft into an avoidable simulate failure.
  return {
    targets: [draft.target.trim() as Hex],
    values: [BigInt(draft.value.trim())],
    calldatas: [draft.calldata.trim() as Hex],
    description: draft.description.trim(),
    privacyFloor: Number(draft.privacyFloor),
  }
}

function isAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value.trim())
}
