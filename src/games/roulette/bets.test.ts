import { describe, expect, it } from 'vitest'
import { PAYOUT, resolve, validateBet } from '../../engine/roulette'
import { cellOf, insideSpots, spotKey, spotWins, toEngineBet, toEngineBets, type InsideSpot } from './bets'

const spots = insideSpots()
const find = (kind: string, ...nums: number[]) =>
  spots.find((s) => s.spot.kind === kind && [...s.spot.numbers].sort((a, b) => a - b).join() === [...nums].sort((a, b) => a - b).join())

/** Board-geometry check: every number in a spot must touch the spot's position. */
function touches(s: InsideSpot, n: number) {
  if (n === 0) return s.x === 0
  const { col, row } = cellOf(n)
  const eps = 1e-9
  // streets / six-lines sit on the outer (bottom) edge: only the column has to match
  // (as does the first four, at the 0 / bottom-edge corner)
  if (s.spot.kind === 'street' || s.spot.kind === 'line' || (s.spot.kind === 'corner' && s.spot.numbers.includes(0)))
    if (s.y === 1) return s.y === 1 && s.x >= (col - 1) / 12 - eps && s.x <= col / 12 + eps
  return s.x >= (col - 1) / 12 - eps && s.x <= col / 12 + eps && s.y >= row / 3 - eps && s.y <= (row + 1) / 3 + eps
}

describe('roulette board spots', () => {
  it('has the standard European counts', () => {
    const count = (k: string, zero = false) => spots.filter((s) => s.spot.kind === k && s.spot.numbers.includes(0) === zero).length
    expect(count('split')).toBe(57)
    expect(count('street')).toBe(12)
    expect(count('corner')).toBe(22)
    expect(count('line')).toBe(11)
    expect(count('split', true)).toBe(3)
    expect(count('street', true)).toBe(2) // trios
    expect(count('corner', true)).toBe(1) // first four
  })

  it('every spot is a valid engine bet with unique key, touching its numbers', () => {
    const keys = new Set<string>()
    for (const s of spots) {
      const bet = toEngineBet(s.spot, 5)
      expect(() => validateBet(bet)).not.toThrow()
      expect(bet.amount).toBe(5)
      expect(keys.has(spotKey(s.spot))).toBe(false)
      keys.add(spotKey(s.spot))
      for (const n of s.spot.numbers) expect(touches(s, n), `${s.label} @${s.x},${s.y} vs ${n}`).toBe(true)
      expect(s.label).toMatch(/\d/)
    }
  })

  it('maps specific spots to the right engine bets', () => {
    expect(toEngineBet(find('street', 1, 2, 3)!.spot, 10)).toEqual({ kind: 'street', numbers: [1, 2, 3], amount: 10 })
    expect(toEngineBet(find('street', 34, 35, 36)!.spot, 1)).toMatchObject({ numbers: [34, 35, 36] })
    expect(toEngineBet(find('corner', 1, 2, 4, 5)!.spot, 1)).toMatchObject({ kind: 'corner', numbers: [1, 2, 4, 5] })
    expect(find('corner', 2, 3, 5, 6)).toBeDefined()
    expect(find('corner', 3, 4, 6, 7)).toBeUndefined() // not adjacent on the board
    expect(toEngineBet(find('line', 31, 32, 33, 34, 35, 36)!.spot, 1)).toMatchObject({ kind: 'line' })
    for (const n of [1, 2, 3]) expect(toEngineBet(find('split', 0, n)!.spot, 1)).toEqual({ kind: 'split', numbers: [0, n], amount: 1 })
    expect(find('split', 3, 4)).toBeUndefined()
    expect(find('street', 0, 1, 2)!.label).toBe('Trio 0, 1, 2')
    expect(find('corner', 0, 1, 2, 3)!.label).toBe('First four 0, 1, 2, 3')
  })

  it('pays out through the engine and highlights the right winners', () => {
    const bets = { a: { spot: find('corner', 17, 18, 20, 21)!.spot, amount: 10 }, b: { spot: find('split', 0, 2)!.spot, amount: 10 } }
    const r = resolve(toEngineBets(bets), 20)
    expect(r.bets.map((b) => b.payout)).toEqual([10 * (PAYOUT.corner + 1), 0])
    expect(spotWins(find('split', 0, 2)!.spot, 0)).toBe(true)
    expect(spotWins(find('line', 1, 2, 3, 4, 5, 6)!.spot, 7)).toBe(false)
    expect(spotWins({ kind: 'dozen', index: 2 }, 13)).toBe(true)
  })
})
