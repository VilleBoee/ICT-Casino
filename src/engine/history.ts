import type { Chips, GameId } from './types'

export const HISTORY_KEY = 'ict-casino:history'
export const HISTORY_VERSION = 1
export const HISTORY_CAP = 1000
/** A new session starts on app load or after this much idle time between rounds. */
export const SESSION_IDLE_MS = 30 * 60 * 1000
const WALLET_KEY = 'ict-casino:wallet'
const GAMES: GameId[] = ['roulette', 'blackjack', 'holdem', 'slots', 'videopoker', 'baccarat', 'crash', 'dice', 'pajatso', 'plinko']

export interface HistoryEntry {
  game: GameId
  stake: Chips
  /** Total returned, including stake. */
  payout: Chips
  /** payout - stake */
  net: Chips
  /** Epoch ms when the round was settled. */
  at: number
  roundId: string
  sessionId: string
  /** Wallet balance right after settling, or null for entries migrated from the old wallet history. */
  balance: Chips | null
}

export interface HistoryLog { version: typeof HISTORY_VERSION; entries: HistoryEntry[] }

interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void }
export interface HistoryOptions { cap?: number; idleMs?: number; id?: () => string }

const isInt = (x: unknown): x is number => Number.isInteger(x)
function validEntry(e: unknown): e is HistoryEntry {
  const x = e as HistoryEntry
  return !!x && typeof x === 'object' && GAMES.includes(x.game) && isInt(x.stake) && x.stake >= 0 && isInt(x.payout) && x.payout >= 0 &&
    x.net === x.payout - x.stake && Number.isFinite(x.at) && typeof x.roundId === 'string' && typeof x.sessionId === 'string' &&
    (x.balance === null || isInt(x.balance))
}

const randomId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/**
 * Versioned, capped round log in its own localStorage key (oldest entry first).
 * On first load it migrates the short history kept inside the wallet.
 */
export class HistoryStore {
  private log: HistoryLog
  private listeners = new Set<(entries: readonly HistoryEntry[]) => void>()
  private storage: KV
  private now: () => number
  private cap: number
  private idleMs: number
  private id: () => string
  private session: string
  private lastActivity: number

  constructor(storage: KV, now: () => number = Date.now, opts: HistoryOptions = {}) {
    this.storage = storage
    this.now = now
    this.cap = opts.cap ?? HISTORY_CAP
    this.idleMs = opts.idleMs ?? SESSION_IDLE_MS
    this.id = opts.id ?? randomId
    this.log = this.load()
    // app load = new session
    this.session = `s-${this.id()}`
    this.lastActivity = this.now()
  }

  private load(): HistoryLog {
    let raw: string | null = null
    try { raw = this.storage.getItem(HISTORY_KEY) } catch { /* storage unavailable */ }
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw) as HistoryLog
        if (parsed && parsed.version === HISTORY_VERSION && Array.isArray(parsed.entries)) {
          return { version: HISTORY_VERSION, entries: parsed.entries.filter(validEntry).slice(-this.cap) }
        }
      } catch { /* corrupt: start empty, don't re-migrate stale wallet data over it */ }
      return this.persist({ version: HISTORY_VERSION, entries: [] })
    }
    return this.persist({ version: HISTORY_VERSION, entries: this.migrate() })
  }

  /** Old wallet history is newest-first { game, stake, payout, at }. */
  private migrate(): HistoryEntry[] {
    try {
      const w = JSON.parse(this.storage.getItem(WALLET_KEY) ?? 'null') as { history?: { game: GameId; stake: number; payout: number; at: number }[] } | null
      const old = Array.isArray(w?.history) ? w!.history : []
      return old.slice().reverse().map((h, i): HistoryEntry => ({
        game: h.game, stake: h.stake, payout: h.payout, net: h.payout - h.stake, at: h.at,
        roundId: `legacy-${i}`, sessionId: 'legacy', balance: null,
      })).filter(validEntry).slice(-this.cap)
    } catch { return [] }
  }

  private persist(log: HistoryLog): HistoryLog {
    try { this.storage.setItem(HISTORY_KEY, JSON.stringify(log)) } catch { /* quota or private mode: keep in memory */ }
    return log
  }

  private emit() { this.listeners.forEach((l) => l(this.log.entries)) }

  /** Oldest first. Treat as read-only. */
  get entries(): readonly HistoryEntry[] { return this.log.entries }
  get sessionId(): string { return this.session }

  /** Appends a settled round. Called by Wallet.settle(). */
  record(r: { game: GameId; stake: Chips; payout: Chips; roundId?: string }, balance: Chips | null): HistoryEntry {
    const at = this.now()
    if (at - this.lastActivity > this.idleMs) this.session = `s-${this.id()}`
    this.lastActivity = at
    const entry: HistoryEntry = {
      game: r.game, stake: r.stake, payout: r.payout, net: r.payout - r.stake, at,
      roundId: r.roundId ?? `r-${this.id()}`, sessionId: this.session, balance,
    }
    const entries = [...this.log.entries, entry]
    this.log = this.persist({ version: HISTORY_VERSION, entries: entries.slice(-this.cap) })
    this.emit()
    return entry
  }

  clearHistory(): void {
    this.log = this.persist({ version: HISTORY_VERSION, entries: [] })
    this.emit()
  }

  subscribe(fn: (entries: readonly HistoryEntry[]) => void): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }
}
