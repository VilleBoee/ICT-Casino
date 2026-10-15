import { summarize, type HistoryEntry, type StatsSummary, type Wallet } from '../engine'

/** useSyncExternalStore source over a wallet's round history (kept React-free so it can be unit tested). */
export function historySource(w: Wallet) {
  let cachedFor: readonly HistoryEntry[] | null = null
  let cached: StatsSummary | null = null
  return {
    subscribe: (cb: () => void) => w.history.subscribe(() => cb()),
    getSnapshot: (): readonly HistoryEntry[] => w.history.entries,
    /** summarize(), memoized on the entries array identity. */
    summary(entries: readonly HistoryEntry[]): StatsSummary {
      if (entries !== cachedFor) { cachedFor = entries; cached = summarize(entries) }
      return cached!
    },
  }
}

export type ResetKind = 'stats' | 'wallet' | 'both'
/** Clears round history only; the balance is untouched. */
export const resetStats = (w: Wallet) => w.history.clearHistory()
/** Resets the balance only; history is kept. */
export const resetWallet = (w: Wallet) => w.reset()
/** Fresh start: wallet reset, then history cleared. */
export const resetBoth = (w: Wallet) => { w.reset(); w.history.clearHistory() }
export const RESETS: Record<ResetKind, { label: string; run: (w: Wallet) => void }> = {
  stats: { label: 'Reset stats', run: resetStats },
  wallet: { label: 'Reset wallet', run: resetWallet },
  both: { label: 'Reset both', run: resetBoth },
}
