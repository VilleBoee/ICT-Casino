import { describe, it, expect } from 'vitest'
import { CrashRound, crashPointFromUniform, crashPointFromSeed, newCrashSeed, multiplierAt, timeForMultiplier } from './crash'
import { Wallet, STARTING_BALANCE } from './wallet'
import { seededRng } from './rng'

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }
const wallet = () => new Wallet(mem(), () => 0)
/** Finds a seed whose round crashes in the given range. */
const roundWith = (pred: (cp: number) => boolean, opts: { autoCashOut?: number } = {}) => {
  for (let s = 1; ; s++) {
    const w = wallet()
    const r = new CrashRound(w, 100, { ...opts, rng: seededRng(s) })
    if (pred(r["point"])) return { w, r }
  }
}

describe('crash', () => {
  it('maps uniforms to crash points with a 1% edge', () => {
    expect(crashPointFromUniform(0)).toBe(1)
    expect(crashPointFromUniform(0.5)).toBe(1.98)
    expect(crashPointFromUniform(0.75)).toBe(3.96)
    expect(() => crashPointFromUniform(1)).toThrow()
  })
  it('P(crash >= m) is about 0.99/m', () => {
    const rng = seededRng(25), n = 200_000
    for (const m of [1.5, 2, 5, 10]) {
      let hits = 0
      for (let i = 0; i < n; i++) if (crashPointFromSeed(newCrashSeed(rng)) >= m) hits++
      expect(hits / n).toBeCloseTo(0.99 / m, 2)
    }
  })
  it('seeds are 13 hex digits and verifiable', () => {
    const s = newCrashSeed(seededRng(1))
    expect(s).toMatch(/^[0-9a-f]{13}$/)
    expect(crashPointFromSeed(s)).toBe(crashPointFromSeed(s))
    expect(() => crashPointFromSeed('xyz')).toThrow()
  })
  it('multiplier curve grows from 1 and inverts', () => {
    expect(multiplierAt(0)).toBe(1)
    expect(multiplierAt(timeForMultiplier(2) + 1)).toBe(2)
    expect(multiplierAt(20_000)).toBeGreaterThan(multiplierAt(10_000))
  })
  it('manual cash-out before the crash pays bet * multiplier', () => {
    const { w, r } = roundWith((cp) => cp > 3)
    expect(w.balance).toBe(STARTING_BALANCE - 100)
    expect(r.cashOut(timeForMultiplier(2) + 1)).toBe(true)
    expect(r.result()).toMatchObject({ stake: 100, payout: 200, outcome: { cashedAt: 2, auto: false } })
    expect(w.balance).toBe(STARTING_BALANCE - 100)
  })
  it('cashing out after the crash loses', () => {
    const { r } = roundWith((cp) => cp > 1 && cp < 2)
    expect(r.cashOut(timeForMultiplier(2.5))).toBe(false)
    expect(r.status).toBe('crashed')
    expect(r.result().payout).toBe(0)
  })
  it('auto cash-out fires at the target when it survives', () => {
    const { r } = roundWith((cp) => cp >= 1.5, { autoCashOut: 1.5 })
    expect(r.tick(timeForMultiplier(1.2)).status).toBe('running')
    expect(r.tick(timeForMultiplier(3)).status).toBe('cashed')
    expect(r.result()).toMatchObject({ payout: 150, outcome: { cashedAt: 1.5, auto: true } })
  })
  it('auto cash-out above the crash point loses', () => {
    const { r } = roundWith((cp) => cp > 1 && cp < 1.5, { autoCashOut: 1.5 })
    expect(r.finish().payout).toBe(0)
  })
  it('result is unavailable while running and validates input', () => {
    const { r } = roundWith((cp) => cp > 2)
    expect(() => r.result()).toThrow()
    expect(r.tick(1000).multiplier).toBeLessThan(2)
    expect(() => new CrashRound(wallet(), 0)).toThrow()
    expect(() => new CrashRound(wallet(), 10, { autoCashOut: 1 })).toThrow()
  })
})
