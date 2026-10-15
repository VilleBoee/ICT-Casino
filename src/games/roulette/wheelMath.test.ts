import { describe, expect, it } from 'vitest'
import { POCKET_DEG, WHEEL_ORDER, pocketIndex, targetRotation } from './wheelMath'

const atTop = (rot: number) => {
  const i = Math.round(((((-rot) % 360) + 360) % 360) / POCKET_DEG) % 37
  return WHEEL_ORDER[i]
}

describe('roulette wheel mapping', () => {
  it('has all 37 numbers once', () => {
    expect([...WHEEL_ORDER].sort((a, b) => a - b)).toEqual(Array.from({ length: 37 }, (_, i) => i))
  })
  it('always lands on the requested number, from any start', () => {
    let rot = 0
    for (let k = 0; k < 200; k++) {
      const n = (k * 7 + 3) % 37
      const next = targetRotation(rot, n)
      expect(next - rot).toBeGreaterThanOrEqual(5 * 360)
      expect(atTop(next)).toBe(n)
      rot = next + (k % 3) * 0.0 // chained spins
    }
  })
  it('index lookup', () => {
    expect(pocketIndex(0)).toBe(0)
    expect(pocketIndex(26)).toBe(36)
  })
})
