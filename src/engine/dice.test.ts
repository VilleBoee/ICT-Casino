import { describe, it, expect } from 'vitest'
import { rollDice, winChance, diceMultiplier, diceWins, validateDiceBet } from './dice'
import { Wallet, STARTING_BALANCE } from './wallet'
import { seededRng } from './rng'

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }

describe('dice', () => {
  it('win chance and multiplier', () => {
    expect(winChance(50, 'under')).toBe(50)
    expect(winChance(49.99, 'over')).toBe(50)
    expect(diceMultiplier(50)).toBe(1.98)
    expect(diceMultiplier(1)).toBe(99)
    expect(diceMultiplier(33)).toBe(3)
  })
  it('chance matches the count of winning rolls exactly', () => {
    for (const [t, d] of [[50, 'under'], [10.5, 'under'], [94.99, 'over'], [4.99, 'over']] as const) {
      let wins = 0
      for (let i = 0; i < 10000; i++) if (diceWins(i / 100, { target: t, direction: d })) wins++
      expect(wins / 100).toBe(winChance(t, d))
    }
  })
  it('enforces limits', () => {
    expect(() => validateDiceBet({ amount: 10, target: 0.5, direction: 'under' })).toThrow()
    expect(() => validateDiceBet({ amount: 10, target: 96, direction: 'under' })).toThrow()
    expect(() => validateDiceBet({ amount: 10, target: 50.123, direction: 'under' })).toThrow()
    expect(() => validateDiceBet({ amount: 0, target: 50, direction: 'under' })).toThrow()
    expect(() => validateDiceBet({ amount: 10, target: 1, direction: 'under' })).not.toThrow()
    expect(() => validateDiceBet({ amount: 10, target: 95, direction: 'under' })).not.toThrow()
  })
  it('debits and returns payout without crediting', () => {
    const w = new Wallet(mem(), () => 0)
    const rng = seededRng(27)
    let sawWin = false, sawLoss = false
    for (let i = 0; i < 20; i++) {
      const r = rollDice(w, { amount: 10, target: 50, direction: 'under' }, rng)
      expect(r.outcome.roll).toBeGreaterThanOrEqual(0)
      expect(r.outcome.roll).toBeLessThanOrEqual(99.99)
      expect(r.payout).toBe(r.outcome.won ? 19 : 0)
      if (r.outcome.won) sawWin = true; else sawLoss = true
    }
    expect(sawWin && sawLoss).toBe(true)
    expect(w.balance).toBe(STARTING_BALANCE - 200)
  })
})
