import type { SafeInstall } from '../hooks/useInstall.ts'

/** The four public/private boundaries screen 1 must explain before Install
 * (surface map §Confidential voting overview). */
export const BOUNDARIES = [
  { public: 'Who may vote and their fixed weight', private: 'Which way each wallet voted' },
  { public: 'That a wallet took part, and when', private: 'The exact For / Against / Abstain totals' },
  { public: 'Every replacement and its sequence', private: 'The choice inside any operation' },
  { public: 'The final pass or reject verdict', private: 'Everything until the privacy floor is met' },
] as const

/** Screen 3's installation-verification states, projected from the Safe reads. */
export type InstallVerificationState =
  | { phase: 'verifying' }
  | { phase: 'verified'; install: SafeInstall }
  | { phase: 'mismatch'; install: SafeInstall; detail: string }
  | { phase: 'removed'; install: SafeInstall }
  | { phase: 'unverified'; reason: string }

export function installVerificationState(
  install: SafeInstall | undefined,
  isLoading: boolean,
  isError: boolean,
): InstallVerificationState {
  if (isError) return { phase: 'unverified', reason: 'The Safe or module could not be read on this network.' }
  if (isLoading || install === undefined) return { phase: 'verifying' }
  if (!install.bindingConsistent) {
    return {
      phase: 'mismatch',
      install,
      detail: 'The module points at a different Safe than the one under review. Do not trust this pairing.',
    }
  }
  if (!install.moduleEnabled) return { phase: 'removed', install }
  return { phase: 'verified', install }
}
