import { describe, expect, it } from 'vitest'
import { Wallet } from '../../engine/wallet'
import { rollDice, validateDiceBet, winChance } from '../../engine/dice'
import { clampTarget, mirrorTarget, preview, targetRange } from './odds'

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }

describe('dice odds preview', () => {
  it('range edges are valid engine bets', () => {
    for (const d of ['over', 'under'] as const) {
      const { min, max } = targetRange(d)
      expect(() => validateDiceBet({ amount: 1, target: min, direction: d })).not.toThrow()
      expect(() => validateDiceBet({ amount: 1, target: max, direction: d })).not.toThrow()
    }
    expect(clampTarget(0, 'under')).toBe(1)
    expect(clampTarget(100, 'over')).toBe(98.99)
  })
  it('preview matches what the engine pays', () => {
    const w = new Wallet(mem())
    for (const [t, d] of [[50, 'under'], [49.5, 'over'], [12.34, 'under'], [90, 'over']] as const) {
      const p = preview(10, t, d)
      const r = rollDice(w, { amount: 10, target: t, direction: d })
      expect(r.outcome.chance).toBe(p.chance)
      expect(r.outcome.multiplier).toBe(p.multiplier)
      if (r.outcome.won) expect(r.payout).toBe(p.payout)
    }
  })
  it('mirroring keeps the chance', () => {
    expect(winChance(mirrorTarget(30, 'over'), 'over')).toBe(winChance(30, 'under'))
  })
})
