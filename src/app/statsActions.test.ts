import { describe, it, expect, vi } from 'vitest'
import { Wallet, STARTING_BALANCE } from '../engine'
import { historySource, resetStats, resetWallet, resetBoth, RESETS } from './statsActions'

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }
function setup() {
  const w = new Wallet(mem(), () => 1_000)
  const play = (stake: number, payout: number) => w.settle({ game: 'dice', stake, payout, roundId: `r${Math.random()}` })
  return { w, play }
}
function played() {
  const s = setup()
  // the engine debits at round start; mimic that so balances line up
  s.w.debit(10); s.play(10, 25)
  s.w.debit(10); s.play(10, 0)
  return s
}

describe('historySource', () => {
  it('notifies subscribers and returns a new snapshot when a round is recorded', () => {
    const { w, play } = setup()
    const src = historySource(w)
    const cb = vi.fn()
    const unsub = src.subscribe(cb)
    const before = src.getSnapshot()
    play(10, 20)
    expect(cb).toHaveBeenCalled()
    expect(src.getSnapshot()).not.toBe(before)
    expect(src.getSnapshot()).toHaveLength(1)
    unsub(); play(10, 0)
    expect(cb).toHaveBeenCalledTimes(1)
  })
  it('summary matches the entries and is memoized per snapshot', () => {
    const { w } = played()
    const src = historySource(w)
    const e = src.getSnapshot()
    const s = src.summary(e)
    expect(s.overall.rounds).toBe(2)
    expect(s.overall.wagered).toBe(20)
    expect(s.overall.net).toBe(5)
    expect(s.winRate).toBe(0.5)
    expect(src.summary(e)).toBe(s)
  })
  it('getSnapshot is stable between changes (no render loop)', () => {
    const { w } = played()
    const src = historySource(w)
    expect(src.getSnapshot()).toBe(src.getSnapshot())
  })
})

describe('reset handlers', () => {
  it('resetStats clears history only', () => {
    const { w } = played()
    const bal = w.snapshot.balance
    const cb = vi.fn(); historySource(w).subscribe(cb)
    resetStats(w)
    expect(w.history.entries).toHaveLength(0)
    expect(w.snapshot.balance).toBe(bal)
    expect(cb).toHaveBeenCalled()
  })
  it('resetWallet resets the balance only', () => {
    const { w } = played()
    w.debit(300)
    resetWallet(w)
    expect(w.snapshot.balance).toBe(STARTING_BALANCE)
    expect(w.history.entries).toHaveLength(2)
  })
  it('resetBoth does both', () => {
    const { w } = played()
    w.debit(300)
    resetBoth(w)
    expect(w.snapshot.balance).toBe(STARTING_BALANCE)
    expect(w.history.entries).toHaveLength(0)
  })
  it('RESETS maps each action to its handler', () => {
    expect(RESETS.stats.run).toBe(resetStats)
    expect(RESETS.wallet.run).toBe(resetWallet)
    expect(RESETS.both.run).toBe(resetBoth)
  })
})
