import { useSyncExternalStore } from 'react'
import type { HistoryEntry, StatsSummary } from '../engine'
import { historySource } from './statsActions'
import { wallet } from './wallet'

const source = historySource(wallet)

/** Live round history (oldest first) and its summary; re-renders when a round is recorded or history is cleared. */
export function useHistory(): { entries: readonly HistoryEntry[]; summary: StatsSummary } {
  const entries = useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot)
  return { entries, summary: source.summary(entries) }
}
