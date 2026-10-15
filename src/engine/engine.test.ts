import { describe, it, expect } from 'vitest'
import { Wallet, STARTING_BALANCE, DAILY_REFILL } from './wallet'
import { seededRng, shuffle } from './rng'

const memStore = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }

describe('wallet', () => {
  it('debits, settles and persists', () => {
    const s = memStore()
    const w = new Wallet(s, () => 0)
    w.debit(100)
    expect(w.balance).toBe(STARTING_BALANCE - 100)
    w.settle({ game: 'roulette', stake: 100, payout: 3600 })
    expect(new Wallet(s, () => 0).balance).toBe(STARTING_BALANCE - 100 + 3600)
  })
  it('rejects bad bets', () => {
    const w = new Wallet(memStore(), () => 0)
    expect(() => w.debit(0)).toThrow()
    expect(() => w.debit(1.5)).toThrow()
    expect(() => w.debit(STARTING_BALANCE + 1)).toThrow()
  })
  it('refills once per day', () => {
    let t = 0
    const w = new Wallet(memStore(), () => t)
    expect(w.refill()).toBe(false)
    t = 24 * 3600 * 1000
    expect(w.refill()).toBe(true)
    expect(w.balance).toBe(STARTING_BALANCE + DAILY_REFILL)
  })
})

describe('rng', () => {
  it('seeded rng is deterministic', () => {
    const a = seededRng(42), b = seededRng(42)
    expect([a.next(), a.next()]).toEqual([b.next(), b.next()])
  })
  it('shuffle keeps all items', () => {
    expect(shuffle([1, 2, 3, 4, 5], seededRng(1)).sort()).toEqual([1, 2, 3, 4, 5])
  })
})
