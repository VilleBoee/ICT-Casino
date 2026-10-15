import { describe, it, expect } from 'vitest'
import { spinSlots, rollSlots, evaluateGrid, slotsRtp, randomSymbol, PAYLINES, SLOT_WEIGHTS, type SlotSymbol } from './slots'
import { Wallet, STARTING_BALANCE } from './wallet'
import { seededRng } from './rng'

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }
const fill = (s: SlotSymbol): SlotSymbol[][] => Array.from({ length: 5 }, () => [s, s, s])

describe('slots', () => {
  it('has 10 distinct paylines', () => {
    expect(PAYLINES).toHaveLength(10)
    expect(new Set(PAYLINES.map((l) => l.join())).size).toBe(10)
  })
  it('a full screen pays every line 5 of a kind', () => {
    const wins = evaluateGrid(fill('root'), 2)
    expect(wins).toHaveLength(10)
    expect(wins.every((w) => w.count === 5 && w.payout === 10000)).toBe(true)
  })
  it('counts only consecutive symbols from the left', () => {
    const g = fill('bug')
    g[3] = ['git', 'git', 'git']
    expect(evaluateGrid(g, 1).every((w) => w.count === 3 && w.payout === 5)).toBe(true)
    g[1] = ['git', 'git', 'git']
    expect(evaluateGrid(g, 1)).toEqual([])
  })
  it('follows zig-zag lines', () => {
    const g: SlotSymbol[][] = Array.from({ length: 5 }, () => ['bug', 'coffee', 'git'])
    g[0][0] = 'cpu'; g[1][1] = 'cpu'; g[2][2] = 'cpu'; g[3][1] = 'cpu'; g[4][0] = 'cpu'
    expect(evaluateGrid(g, 1).find((w) => w.line === 3)).toMatchObject({ symbol: 'cpu', count: 5, payout: 1000 })
  })
  it('debits the stake and returns the payout without crediting', () => {
    const w = new Wallet(mem(), () => 0)
    const r = spinSlots(w, 3, seededRng(1))
    expect(r.stake).toBe(30)
    expect(w.balance).toBe(STARTING_BALANCE - 30)
    expect(r.payout).toBe(r.outcome.wins.reduce((a, x) => a + x.payout, 0))
    expect(r.outcome.grid).toHaveLength(5)
    expect(() => spinSlots(w, 0)).toThrow()
    expect(() => spinSlots(w, 1.5)).toThrow()
  })
  it('symbol frequencies follow weights', () => {
    const rng = seededRng(2), n = 200_000, seen: Record<string, number> = {}
    for (let i = 0; i < n; i++) { const s = randomSymbol(rng); seen[s] = (seen[s] ?? 0) + 1 }
    const total = Object.values(SLOT_WEIGHTS).reduce((a, b) => a + b, 0)
    for (const [s, wt] of Object.entries(SLOT_WEIGHTS)) expect(seen[s] / n).toBeCloseTo(wt / total, 2)
  })
  it('theoretical RTP is between 95% and 97%', () => {
    expect(slotsRtp()).toBeGreaterThan(0.95)
    expect(slotsRtp()).toBeLessThan(0.97)
  })
  it('seeded Monte Carlo RTP matches theory', () => {
    const rng = seededRng(19)
    let staked = 0, paid = 0
    for (let i = 0; i < 300_000; i++) { staked += 10; paid += rollSlots(1, rng).payout }
    expect(Math.abs(paid / staked - slotsRtp())).toBeLessThan(0.02)
  })
})
