import { describe, expect, it } from 'vitest'
import { multiplierAt, timeForMultiplier } from '../../engine/crash'
import { VIEW_H, VIEW_W, curvePoints, parseAuto, scales, toXY, yTicks } from './graph'

describe('crash graph helpers', () => {
  it('curve starts bottom-left and ends inside the view, driven by the engine', () => {
    const t = timeForMultiplier(3)
    const pts = curvePoints(t, Infinity).split(' ').map((p) => p.split(',').map(Number))
    expect(pts[0]).toEqual([0, VIEW_H])
    const [x, y] = pts.at(-1)!
    const s = scales(t, multiplierAt(t))
    expect(x).toBeCloseTo((t / s.xMax) * VIEW_W, 0)
    expect(y).toBeGreaterThan(0)
    expect(y).toBeLessThan(VIEW_H)
  })
  it('caps the curve at the crash point', () => {
    const s = { xMax: 10000, yMax: 3 }
    expect(toXY(0, 1, s)).toEqual({ x: 0, y: VIEW_H })
    expect(toXY(10000, 3, s)).toEqual({ x: VIEW_W, y: 0 })
    const pts = curvePoints(timeForMultiplier(5), 2).split(' ').map((p) => Number(p.split(',')[1]))
    expect(Math.min(...pts)).toBeGreaterThanOrEqual(0)
  })
  it('ticks and parsing', () => {
    expect(yTicks(2)).toEqual([1.25, 1.5, 1.75])
    expect(parseAuto('2')).toBe(2)
    expect(parseAuto('1,555x')).toBe(1.55)
    expect(parseAuto('1')).toBeUndefined()
    expect(parseAuto('')).toBeUndefined()
    expect(parseAuto('abc')).toBeUndefined()
  })
})
