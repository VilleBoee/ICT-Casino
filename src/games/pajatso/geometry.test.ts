import { describe, expect, it } from 'vitest'
import { PAJATSO_CUPS, PAJATSO_ROWS, Wallet, pajatsoPath, playPajatso, seededRng } from '../../engine'
import { COIN_R, CUPS, PIN_R, W, coinKeyframes, cupX, pins, rowY } from './geometry'

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }

describe('pajatso geometry', () => {
  it('9 cups span the machine symmetrically', () => {
    expect(CUPS).toBe(PAJATSO_CUPS.length)
    expect(cupX(0) + cupX(CUPS - 1)).toBeCloseTo(W)
  })
  it('the coin touches a real pin on every row and ends in the engine cup', () => {
    const all = pins()
    const rng = seededRng(7)
    for (let cup = 0; cup < CUPS; cup++) {
      const path = pajatsoPath(cup, rng)
      const kf = coinKeyframes(path, cup)
      for (let i = 0; i < PAJATSO_ROWS; i++) {
        const cx = kf.x[1 + i * 2], cy = kf.y[1 + i * 2]
        expect(all.some((p) => Math.abs(p.x - cx) < 1e-6 && Math.abs(p.y - (cy + PIN_R + COIN_R - 1)) < 1e-6)).toBe(true)
        expect(cy).toBeLessThan(rowY(i))
      }
      expect(kf.x.at(-1)).toBeCloseTo(cupX(cup))
      expect(kf.pinHits).toHaveLength(PAJATSO_ROWS)
      expect(kf.times).toEqual([...kf.times].sort((a, b) => a - b))
    }
  })
  it('pajatso rounds are kept in the history log for stats', () => {
    const s = mem()
    const w = new Wallet(s, () => 1)
    w.settle(playPajatso(w, 5, seededRng(3)))
    expect(new Wallet(s, () => 2).history.entries.map((e) => e.game)).toEqual(['pajatso'])
  })
})
