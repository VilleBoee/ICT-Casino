import { describe, it, expect } from 'vitest'
import { resolve, spin, colorOf, type RouletteBet } from './roulette'
import { Wallet, STARTING_BALANCE } from './wallet'
import { seededRng } from './rng'

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }

describe('roulette', () => {
  it('pays 35:1 straight up', () => {
    expect(resolve([{ kind: 'straight', number: 17, amount: 10 }], 17).bets[0].payout).toBe(360)
  })
  it('zero loses outside bets', () => {
    const out = resolve([{ kind: 'red', amount: 10 }, { kind: 'even', amount: 10 }, { kind: 'dozen', index: 1, amount: 10 }], 0)
    expect(out.bets.every((b) => !b.won)).toBe(true)
  })
  it('colors and columns', () => {
    expect(colorOf(1)).toBe('red'); expect(colorOf(2)).toBe('black'); expect(colorOf(0)).toBe('green')
    expect(resolve([{ kind: 'column', index: 3, amount: 1 }], 36).bets[0].won).toBe(true)
  })
  it('spin debits now and does not credit', () => {
    const w = new Wallet(mem(), () => 0)
    const r = spin(w, [{ kind: 'red', amount: 100 }], seededRng(3))
    expect(w.balance).toBe(STARTING_BALANCE - 100)
    w.settle(r)
    expect(w.balance).toBe(STARTING_BALANCE - 100 + r.payout)
  })
  it('rejects invalid bets without debiting', () => {
    const w = new Wallet(mem(), () => 0)
    expect(() => spin(w, [{ kind: 'split', numbers: [1], amount: 5 }])).toThrow()
    expect(w.balance).toBe(STARTING_BALANCE)
  })
  it('house edge is 1/37 for every bet type', () => {
    const bets: RouletteBet[] = [
      { kind: 'straight', number: 5, amount: 1 }, { kind: 'split', numbers: [1, 2], amount: 1 },
      { kind: 'corner', numbers: [1, 2, 4, 5], amount: 1 }, { kind: 'red', amount: 1 },
      { kind: 'dozen', index: 2, amount: 1 }, { kind: 'line', numbers: [1, 2, 3, 4, 5, 6], amount: 1 },
    ]
    for (const b of bets) {
      let ret = 0
      for (let n = 0; n <= 36; n++) ret += resolve([b], n).bets[0].payout
      expect(ret / 37).toBeCloseTo(36 / 37, 10)
    }
  })
})
