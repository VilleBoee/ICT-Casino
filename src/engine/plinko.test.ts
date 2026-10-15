import { describe, it, expect } from 'vitest'
import { dropPlinko, plinkoRtp, plinkoSlotOdds, validatePlinkoBet, PLINKO_ROWS, PLINKO_RISKS, PLINKO_TABLES, type PlinkoRows } from './plinko'
import { Wallet, STARTING_BALANCE } from './wallet'
import { seededRng } from './rng'

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }

describe('plinko', () => {
  it('tables have rows+1 symmetric slots', () => {
    for (const r of PLINKO_ROWS) for (const k of PLINKO_RISKS) {
      const t = PLINKO_TABLES[r][k]
      expect(t).toHaveLength(r + 1)
      expect([...t].reverse()).toEqual([...t])
    }
  })
  it('slot odds sum to 1', () => {
    for (const r of PLINKO_ROWS) expect(plinkoSlotOdds(r).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
  })
  it('every table has an exact RTP of about 99%', () => {
    for (const r of PLINKO_ROWS) for (const k of PLINKO_RISKS) {
      const rtp = plinkoRtp(r, k)
      expect(rtp).toBeGreaterThan(0.985)
      expect(rtp).toBeLessThan(0.995)
    }
  })
  it('validates bets', () => {
    expect(() => validatePlinkoBet({ amount: 0, rows: 8, risk: 'low' })).toThrow()
    expect(() => validatePlinkoBet({ amount: 1.5, rows: 8, risk: 'low' })).toThrow()
    expect(() => validatePlinkoBet({ amount: 1, rows: 10 as PlinkoRows, risk: 'low' })).toThrow()
    expect(() => validatePlinkoBet({ amount: 1, rows: 8, risk: 'x' as never })).toThrow()
  })
  it('debits first, path matches slot, payout returned unsettled', () => {
    const w = new Wallet(mem())
    const res = dropPlinko(w, { amount: 100, rows: 16, risk: 'high' }, seededRng(1))
    expect(w.balance).toBe(STARTING_BALANCE - 100)
    expect(res.outcome.path).toHaveLength(16)
    expect(res.outcome.slot).toBe(res.outcome.path.filter((s) => s === 'R').length)
    expect(res.outcome.multiplier).toBe(PLINKO_TABLES[16].high[res.outcome.slot])
    expect(res.payout).toBe(Math.floor(100 * res.outcome.multiplier))
    w.settle(res)
    expect(w.balance).toBe(STARTING_BALANCE - 100 + res.payout)
  })
  it('simulated RTP is close to theory (8 rows, medium)', () => {
    const rng = seededRng(42)
    const w = { debit: () => {} } as unknown as Wallet
    let staked = 0, returned = 0
    for (let i = 0; i < 200_000; i++) {
      const r = dropPlinko(w, { amount: 100, rows: 8, risk: 'medium' }, rng)
      staked += r.stake; returned += r.payout
    }
    expect(Math.abs(returned / staked - plinkoRtp(8, 'medium'))).toBeLessThan(0.01)
  })
})
