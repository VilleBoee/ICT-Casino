import { describe, it, expect } from 'vitest'
import { HistoryStore, HISTORY_KEY, HISTORY_CAP, SESSION_IDLE_MS, type HistoryEntry } from './history'
import { summarize, statsByGame, overallNet, winRate, biggestWin, biggestLoss, streaks, sessionStats, balanceSeries } from './stats'
import { Wallet, STORAGE_KEY, STARTING_BALANCE } from './wallet'
import type { GameId } from './types'

const mem = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init))
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}
const clock = (t = 1_000_000) => { const c = { t, now: () => c.t }; return c }
let n = 0
const id = () => `id${n++}`
const e = (game: GameId, stake: number, payout: number, at = 0, sessionId = 's1', balance: number | null = null): HistoryEntry =>
  ({ game, stake, payout, net: payout - stake, at, roundId: `r${at}`, sessionId, balance })

describe('history store', () => {
  it('wallet.settle writes a versioned entry with net, roundId, sessionId and balance', () => {
    const s = mem(), c = clock()
    const w = new Wallet(s, c.now, { id })
    w.debit(100)
    w.settle({ game: 'roulette', stake: 100, payout: 3600, roundId: 'abc' })
    const [x] = w.history.entries
    expect(x).toMatchObject({ game: 'roulette', stake: 100, payout: 3600, net: 3500, at: c.t, roundId: 'abc', balance: STARTING_BALANCE + 3500 })
    expect(x.sessionId).toBe(w.history.sessionId)
    const stored = JSON.parse(s.m.get(HISTORY_KEY)!)
    expect(stored.version).toBe(1)
    expect(stored.entries).toHaveLength(1)
    w.settle({ game: 'dice', stake: 10, payout: 0 })
    expect(w.history.entries[1].roundId).toMatch(/^r-/)
    expect(new Wallet(s, c.now).history.entries).toHaveLength(2) // persisted
  })

  it('caps the log, dropping the oldest', () => {
    const h = new HistoryStore(mem(), () => 0, { cap: 5 })
    for (let i = 0; i < 8; i++) h.record({ game: 'slots', stake: 10, payout: i, roundId: `r${i}` }, null)
    expect(h.entries.map((x) => x.roundId)).toEqual(['r3', 'r4', 'r5', 'r6', 'r7'])
    expect(HISTORY_CAP).toBe(1000)
  })

  it('default cap is 1000', () => {
    const h = new HistoryStore(mem(), () => 0)
    for (let i = 0; i < 1005; i++) h.record({ game: 'slots', stake: 1, payout: 0 }, null)
    expect(h.entries).toHaveLength(1000)
  })

  it('migrates the old wallet history (newest first) once', () => {
    const wallet = { version: 1, balance: 500, lastRefill: 0, history: [
      { game: 'dice', stake: 10, payout: 0, at: 300 }, { game: 'roulette', stake: 50, payout: 100, at: 200 }, { game: 'bogus', stake: 1, payout: 1, at: 100 },
    ] }
    const s = mem({ [STORAGE_KEY]: JSON.stringify(wallet) })
    const w = new Wallet(s, () => 1000)
    expect(w.history.entries.map((x) => [x.game, x.at, x.net, x.sessionId, x.balance])).toEqual([
      ['roulette', 200, 50, 'legacy', null], ['dice', 300, -10, 'legacy', null],
    ])
    w.history.clearHistory()
    expect(new Wallet(s, () => 1000).history.entries).toEqual([]) // not migrated again
  })

  it('survives corrupt storage', () => {
    const bad = mem({ [HISTORY_KEY]: '{not json', [STORAGE_KEY]: JSON.stringify({ version: 1, balance: 5, lastRefill: 0, history: [{ game: 'dice', stake: 1, payout: 0, at: 1 }] }) })
    expect(new HistoryStore(bad).entries).toEqual([])
    expect(JSON.parse(bad.m.get(HISTORY_KEY)!)).toEqual({ version: 1, entries: [] })
    const wrongVersion = mem({ [HISTORY_KEY]: JSON.stringify({ version: 99, entries: [e('dice', 1, 0)] }) })
    expect(new HistoryStore(wrongVersion).entries).toEqual([])
    const mixed = mem({ [HISTORY_KEY]: JSON.stringify({ version: 1, entries: [e('dice', 1, 0), { junk: true }, { ...e('slots', 5, 5), net: 3 }, null] }) })
    expect(new HistoryStore(mixed).entries).toHaveLength(1)
    const badWallet = mem({ [STORAGE_KEY]: '][' })
    expect(new HistoryStore(badWallet).entries).toEqual([])
    const throwing = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('quota') } }
    const h = new HistoryStore(throwing)
    h.record({ game: 'dice', stake: 1, payout: 2 }, null)
    expect(h.entries).toHaveLength(1) // kept in memory
  })

  it('starts a new session on load and after 30 minutes idle', () => {
    const s = mem(), c = clock()
    const h = new HistoryStore(s, c.now, { id })
    const a = h.record({ game: 'dice', stake: 1, payout: 0 }, null)
    c.t += SESSION_IDLE_MS // exactly 30 min: same session
    const b = h.record({ game: 'dice', stake: 1, payout: 0 }, null)
    c.t += SESSION_IDLE_MS + 1
    const d = h.record({ game: 'dice', stake: 1, payout: 0 }, null)
    expect(b.sessionId).toBe(a.sessionId)
    expect(d.sessionId).not.toBe(b.sessionId)
    const reloaded = new HistoryStore(s, c.now, { id })
    expect(reloaded.record({ game: 'dice', stake: 1, payout: 0 }, null).sessionId).not.toBe(d.sessionId)
    expect(new Set(reloaded.entries.map((x) => x.sessionId)).size).toBe(3)
  })

  it('subscribe notifies on record and clear, and unsubscribes', () => {
    const h = new HistoryStore(mem())
    const seen: number[] = []
    const off = h.subscribe((x) => seen.push(x.length))
    h.record({ game: 'dice', stake: 1, payout: 0 }, null)
    h.clearHistory()
    off()
    h.record({ game: 'dice', stake: 1, payout: 0 }, null)
    expect(seen).toEqual([1, 0])
  })
})

describe('stats summaries', () => {
  const log = [
    e('roulette', 100, 0, 1, 'a', 900), e('roulette', 100, 3600, 2, 'a', 4400), e('blackjack', 50, 50, 3, 'a', 4400),
    e('blackjack', 50, 125, 4, 'b', 4475), e('slots', 10, 0, 5, 'b', 4465), e('slots', 10, 0, 6, 'b', 4455), e('slots', 10, 0, 7, 'b', 4445),
  ]
  it('per-game net, rounds, wagered, won and RTP', () => {
    const by = statsByGame(log)
    expect(by.roulette).toMatchObject({ rounds: 2, wagered: 200, won: 3600, net: 3400, rtp: 18, wins: 1, losses: 1 })
    expect(by.blackjack).toMatchObject({ rounds: 2, wagered: 100, won: 175, net: 75, pushes: 1 })
    expect(by.slots).toMatchObject({ rounds: 3, net: -30, rtp: 0 })
    expect(by.dice).toBeUndefined()
  })
  it('overall net, win rate, biggest win and loss', () => {
    expect(overallNet(log)).toBe(3445)
    expect(winRate(log)).toBeCloseTo(2 / 6)
    expect(biggestWin(log)?.net).toBe(3500)
    expect(biggestLoss(log)?.net).toBe(-100)
    expect(winRate([])).toBeNull()
    expect(biggestWin([e('slots', 10, 0)])).toBeNull()
  })
  it('streaks ignore pushes', () => {
    expect(streaks(log)).toEqual({ current: { kind: 'loss', length: 3 }, longestWin: 2, longestLoss: 3 })
    expect(streaks([])).toEqual({ current: { kind: null, length: 0 }, longestWin: 0, longestLoss: 0 })
  })
  it('sessions', () => {
    expect(sessionStats(log)).toEqual([
      { sessionId: 'a', start: 1, end: 3, rounds: 3, net: 3400, wagered: 250 },
      { sessionId: 'b', start: 4, end: 7, rounds: 4, net: 45, wagered: 80 },
    ])
  })
  it('balance series uses stored balances and back-fills migrated ones', () => {
    expect(balanceSeries(log).map((p) => p.balance)).toEqual([900, 4400, 4400, 4475, 4465, 4455, 4445])
    const mixed = [e('dice', 10, 0, 1), e('dice', 10, 20, 2), e('dice', 10, 0, 3, 's', 1000)]
    expect(balanceSeries(mixed).map((p) => p.balance)).toEqual([1000, 1010, 1000])
    expect(balanceSeries([e('dice', 10, 0, 1), e('dice', 10, 30, 2)], 500).map((p) => p.balance)).toEqual([490, 510])
  })
  it('summarize bundles everything and handles an empty log', () => {
    const s = summarize(log)
    expect(s).toMatchObject({ sessionCount: 2, longestWinStreak: 2, overall: { rounds: 7, net: 3445, wagered: 330, won: 3775 } })
    expect(summarize([])).toMatchObject({ sessionCount: 0, winRate: null, biggestWin: null, overall: { rounds: 0, rtp: null } })
  })
  it('works end to end with the wallet', () => {
    const w = new Wallet(mem(), () => 5)
    w.debit(100); w.settle({ game: 'baccarat', stake: 100, payout: 195 })
    w.debit(40); w.settle({ game: 'crash', stake: 40, payout: 0 })
    const s = summarize(w.history.entries)
    expect(s.overall.net).toBe(55)
    expect(balanceSeries(w.history.entries).at(-1)!.balance).toBe(w.balance)
  })
})
