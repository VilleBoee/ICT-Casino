import { describe, expect, it } from 'vitest'
import { seededRng } from '../../engine/rng'
import { POCKET_DEG, WHEEL_ORDER, numberAt, planSpin, pocketIndex, pocketScreenAngle, targetRotation } from './wheelMath'

const atTop = (rot: number) => numberAt(rot, 0)
const mod = (a: number) => ((a % 360) + 360) % 360

describe('roulette wheel mapping', () => {
  it('has all 37 numbers once', () => {
    expect([...WHEEL_ORDER].sort((a, b) => a - b)).toEqual(Array.from({ length: 37 }, (_, i) => i))
  })
  it('targetRotation lands on the requested number at the pointer', () => {
    let rot = 0
    for (let k = 0; k < 200; k++) {
      const n = (k * 7 + 3) % 37
      const next = targetRotation(rot, n)
      expect(next - rot).toBeGreaterThanOrEqual(5 * 360)
      expect(atTop(next)).toBe(n)
      rot = next
    }
  })
  it('index lookup', () => {
    expect(pocketIndex(0)).toBe(0)
    expect(pocketIndex(26)).toBe(36)
  })
})

describe('planSpin (random landing spot)', () => {
  const run = () => {
    const rng = seededRng(73)
    let rot = 0, ball = 0
    const out: { n: number; rot: number; ball: number; dRot: number; dBall: number }[] = []
    for (let k = 0; k < 200; k++) {
      const n = rng.int(37)
      const p = planSpin(rot, ball, n, rng)
      out.push({ n, rot: p.rotation, ball: p.ball, dRot: p.rotation - rot, dBall: p.ball - ball })
      rot = p.rotation; ball = p.ball
    }
    return out
  }
  it('over 200 chained spins the ball always ends exactly over the winning pocket', () => {
    for (const s of run()) {
      expect(numberAt(s.rot, s.ball)).toBe(s.n)
      const off = Math.abs(((mod(s.ball) - pocketScreenAngle(s.rot, s.n) + 540) % 360) - 180)
      expect(off).toBeLessThan(1e-6)
    }
  })
  it('wheel turns clockwise, ball counter-clockwise, both several full turns', () => {
    for (const s of run()) {
      expect(s.dRot).toBeGreaterThanOrEqual(6 * 360)
      expect(s.dRot).toBeLessThan(7 * 360)
      expect(s.dBall).toBeLessThanOrEqual(-14 * 360)
      expect(s.dBall).toBeGreaterThan(-15 * 360)
    }
  })
  it('final positions vary (not always at the top pointer)', () => {
    const r = run()
    const ballSectors = new Set(r.map((s) => Math.floor(mod(s.ball) / 30)))
    const wheelSectors = new Set(r.map((s) => Math.floor(mod(s.rot) / 30)))
    expect(ballSectors.size).toBeGreaterThanOrEqual(10)
    expect(wheelSectors.size).toBeGreaterThanOrEqual(10)
    expect(r.filter((s) => Math.abs(mod(s.ball + POCKET_DEG / 2)) < POCKET_DEG).length).toBeLessThan(30)
  })
})
