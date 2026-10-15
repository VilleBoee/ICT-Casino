import { describe, expect, it } from 'vitest'
import { PLINKO_ROWS, dropPlinko, Wallet, seededRng, type PlinkoRows } from '../../engine'
import { ballKeyframes, board, pegXY, slotTone, slotX, PEG_R, BALL_R } from './geometry'

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }

describe('plinko geometry', () => {
  it('slots are centred under the last row gaps, symmetric', () => {
    for (const rows of PLINKO_ROWS) {
      const b = board(rows)
      expect(slotX(b, 0) + slotX(b, rows)).toBeCloseTo(400)
      expect(slotX(b, 1) - slotX(b, 0)).toBeCloseTo(b.dx)
    }
  })
  it('the ball touches the peg directly below it on every row and ends in the engine slot', () => {
    const w = new Wallet(mem(), () => 0)
    const rng = seededRng(90)
    for (let k = 0; k < 200; k++) {
      const rows = PLINKO_ROWS[k % 3] as PlinkoRows
      const r = dropPlinko(w, { amount: 1, rows, risk: 'medium' }, rng)
      w.settle(r)
      const kf = ballKeyframes(r.outcome), b = board(rows)
      expect(kf.x).toHaveLength(2 * rows + 2)
      expect(kf.times[0]).toBe(0); expect(kf.times.at(-1)).toBe(1)
      for (let i = 1; i < kf.times.length; i++) expect(kf.times[i]).toBeGreaterThan(kf.times[i - 1])
      let rights = 0
      for (let i = 0; i < rows; i++) {
        const peg = pegXY(b, i, rights + 1)
        expect(kf.x[1 + 2 * i]).toBeCloseTo(peg.x)
        expect(kf.y[1 + 2 * i]).toBeCloseTo(peg.y - PEG_R - BALL_R + 1)
        if (r.outcome.path[i] === 'R') rights++
      }
      expect(rights).toBe(r.outcome.slot)
      expect(kf.x.at(-1)).toBeCloseTo(slotX(b, r.outcome.slot))
      expect(kf.pegHits).toHaveLength(rows)
    }
  })
  it('colours slots by value', () => {
    expect(slotTone(1000)).toContain('lose')
    expect(slotTone(0.2)).toContain('muted')
    expect(slotTone(1)).toContain('cyan')
  })
  it('plinko rounds survive a reload in the history log (stats)', () => {
    const s = mem()
    const w = new Wallet(s, () => 1)
    const r = dropPlinko(w, { amount: 5, rows: 8, risk: 'low' }, seededRng(1))
    w.settle(r)
    expect(new Wallet(s, () => 2).history.entries.map((e) => e.game)).toEqual(['plinko'])
  })
})
