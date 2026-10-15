import type { Chips, GameId } from './types'
import type { HistoryEntry } from './history'

export interface GameStats {
  rounds: number
  wagered: Chips
  won: Chips
  net: Chips
  /** won / wagered, or null with nothing wagered. */
  rtp: number | null
  wins: number
  losses: number
  pushes: number
}
export interface Streak { kind: 'win' | 'loss' | null; length: number }
export interface SessionStats { sessionId: string; start: number; end: number; rounds: number; net: Chips; wagered: Chips }
export interface StatsSummary {
  overall: GameStats
  byGame: Partial<Record<GameId, GameStats>>
  /** wins / (wins + losses); pushes are ignored. null with no decided rounds. */
  winRate: number | null
  biggestWin: HistoryEntry | null
  biggestLoss: HistoryEntry | null
  /** Pushes don't break or extend a streak. */
  currentStreak: Streak
  longestWinStreak: number
  longestLossStreak: number
  sessions: SessionStats[]
  sessionCount: number
}

const empty = (): GameStats => ({ rounds: 0, wagered: 0, won: 0, net: 0, rtp: null, wins: 0, losses: 0, pushes: 0 })
function add(s: GameStats, e: HistoryEntry) {
  s.rounds++; s.wagered += e.stake; s.won += e.payout; s.net += e.net
  if (e.net > 0) s.wins++; else if (e.net < 0) s.losses++; else s.pushes++
  s.rtp = s.wagered > 0 ? s.won / s.wagered : null
}

/** Per-game stats. */
export function statsByGame(entries: readonly HistoryEntry[]): Partial<Record<GameId, GameStats>> {
  const by: Partial<Record<GameId, GameStats>> = {}
  for (const e of entries) add((by[e.game] ??= empty()), e)
  return by
}

export function overallStats(entries: readonly HistoryEntry[]): GameStats {
  const s = empty()
  entries.forEach((e) => add(s, e))
  return s
}

export const overallNet = (entries: readonly HistoryEntry[]): Chips => entries.reduce((a, e) => a + e.net, 0)

export function winRate(entries: readonly HistoryEntry[]): number | null {
  const s = overallStats(entries)
  return s.wins + s.losses ? s.wins / (s.wins + s.losses) : null
}

export function biggestWin(entries: readonly HistoryEntry[]): HistoryEntry | null {
  return entries.reduce<HistoryEntry | null>((b, e) => (e.net > 0 && (!b || e.net > b.net) ? e : b), null)
}
export function biggestLoss(entries: readonly HistoryEntry[]): HistoryEntry | null {
  return entries.reduce<HistoryEntry | null>((b, e) => (e.net < 0 && (!b || e.net < b.net) ? e : b), null)
}

/** Entries must be oldest first (as stored). */
export function streaks(entries: readonly HistoryEntry[]): { current: Streak; longestWin: number; longestLoss: number } {
  let current: Streak = { kind: null, length: 0 }, longestWin = 0, longestLoss = 0
  for (const e of entries) {
    if (e.net === 0) continue
    const kind = e.net > 0 ? 'win' : 'loss'
    current = current.kind === kind ? { kind, length: current.length + 1 } : { kind, length: 1 }
    if (kind === 'win') longestWin = Math.max(longestWin, current.length)
    else longestLoss = Math.max(longestLoss, current.length)
  }
  return { current, longestWin, longestLoss }
}

/** Sessions in order of first activity. */
export function sessionStats(entries: readonly HistoryEntry[]): SessionStats[] {
  const map = new Map<string, SessionStats>()
  for (const e of entries) {
    const s = map.get(e.sessionId) ?? { sessionId: e.sessionId, start: e.at, end: e.at, rounds: 0, net: 0, wagered: 0 }
    s.start = Math.min(s.start, e.at); s.end = Math.max(s.end, e.at)
    s.rounds++; s.net += e.net; s.wagered += e.stake
    map.set(e.sessionId, s)
  }
  return [...map.values()].sort((a, b) => a.start - b.start)
}

/**
 * Balance after each round, for charting. Migrated entries have no stored balance; they are
 * back-filled from the next known balance, or from `startingBalance` and the running net if none is known.
 */
export function balanceSeries(entries: readonly HistoryEntry[], startingBalance?: Chips): { at: number; balance: Chips; roundId: string }[] {
  const out = entries.map((e) => ({ at: e.at, balance: e.balance, roundId: e.roundId }))
  // back-fill unknown balances from the right
  let next: number | null = null
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i].balance !== null) next = out[i].balance
    else if (next !== null) out[i].balance = next - entries[i + 1].net
    if (out[i].balance !== null) next = out[i].balance
  }
  let running = startingBalance ?? 0
  return out.map((p, i) => {
    running = p.balance ?? running + entries[i].net
    return { at: p.at, balance: running, roundId: p.roundId }
  })
}

export function summarize(entries: readonly HistoryEntry[]): StatsSummary {
  const st = streaks(entries)
  const sessions = sessionStats(entries)
  return {
    overall: overallStats(entries), byGame: statsByGame(entries), winRate: winRate(entries),
    biggestWin: biggestWin(entries), biggestLoss: biggestLoss(entries),
    currentStreak: st.current, longestWinStreak: st.longestWin, longestLossStreak: st.longestLoss,
    sessions, sessionCount: sessions.length,
  }
}
