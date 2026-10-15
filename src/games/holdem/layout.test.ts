import { describe, expect, it } from 'vitest'
import { blindSeats, clampRaise, presetTo, seatPosition } from './layout'

describe('holdem layout helpers', () => {
  it('puts the human bottom-centre and keeps seats inside the table', () => {
    const p = seatPosition(0, 6)
    expect(p.left).toBeCloseTo(50)
    expect(p.top).toBeCloseTo(90)
    for (let n = 6; n <= 9; n++) for (let i = 0; i < n; i++) {
      const q = seatPosition(i, n)
      expect(q.left).toBeGreaterThanOrEqual(5); expect(q.left).toBeLessThanOrEqual(95)
      expect(q.top).toBeGreaterThanOrEqual(9); expect(q.top).toBeLessThanOrEqual(91)
    }
  })
  it('computes blinds like the engine', () => {
    expect(blindSeats(0, 6)).toEqual({ sb: 1, bb: 2 })
    expect(blindSeats(5, 6)).toEqual({ sb: 0, bb: 1 })
  })
  it('clamps raise presets to engine limits', () => {
    const r = { kind: 'raise' as const, min: 40, max: 500 }
    expect(presetTo(r, 20, 30, 0.5)).toBe(40)
    expect(presetTo(r, 20, 200, 1)).toBe(220)
    expect(presetTo(r, 20, 10_000, 1)).toBe(500)
    expect(clampRaise(r, 1)).toBe(40)
    expect(clampRaise(r, 9999)).toBe(500)
  })
})
