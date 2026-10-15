import { describe, it, expect } from 'vitest'
import { dealCoup, bankerDraws, baccaratPayout, playBaccarat, bigRoad, beadPlate, roadStats, baccaratTotal } from './baccarat'
import { Shoe } from './cards'
import { Wallet, STARTING_BALANCE } from './wallet'
import type { Card, Rank } from './types'

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }
const c = (...r: Rank[]): Card[] => r.map((rank) => ({ rank, suit: 'H' }))
const shoe = (...r: Rank[]) => Shoe.stacked(c(...r))

describe('baccarat', () => {
  it('scores mod 10 with faces as zero and aces as one', () => {
    expect(baccaratTotal(c(13, 14))).toBe(1)
    expect(baccaratTotal(c(9, 8))).toBe(7)
    expect(baccaratTotal(c(10, 11, 12))).toBe(0)
  })
  it('naturals stop the draw', () => {
    const coup = dealCoup(shoe(9, 2, 10, 3, 5, 5)) // P 9, B 5
    expect(coup).toMatchObject({ natural: true, playerTotal: 9, bankerTotal: 5, winner: 'player' })
    expect(coup.player).toHaveLength(2); expect(coup.banker).toHaveLength(2)
  })
  it('player stands on 6-7, banker then draws on 0-5', () => {
    const coup = dealCoup(shoe(6, 2, 10, 3, 4)) // P 6 stands, B 5 draws 4 -> 9
    expect(coup.player).toHaveLength(2)
    expect(coup).toMatchObject({ bankerTotal: 9, winner: 'banker' })
    const coup2 = dealCoup(shoe(7, 6, 10, 10, 9)) // P 7, B 6 stands
    expect(coup2.banker).toHaveLength(2)
    expect(coup2.winner).toBe('player')
  })
  it('player draws on 0-5', () => {
    const coup = dealCoup(shoe(2, 10, 3, 7, 4)) // P 5 draws 4 -> 9; B 7 stands
    expect(coup).toMatchObject({ playerTotal: 9, bankerTotal: 7 })
    expect(coup.banker).toHaveLength(2)
  })
  it('implements the full banker table', () => {
    const table: Record<number, number[]> = { 0: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 1: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 2: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      3: [0, 1, 2, 3, 4, 5, 6, 7, 9], 4: [2, 3, 4, 5, 6, 7], 5: [4, 5, 6, 7], 6: [6, 7], 7: [] }
    for (let b = 0; b <= 7; b++) for (let p = 0; p <= 9; p++) {
      const card = { rank: (p === 0 ? 10 : p === 1 ? 14 : p) as Rank, suit: 'S' as const }
      expect(bankerDraws(b, card), `banker ${b} vs ${p}`).toBe(table[b].includes(p))
    }
    expect(bankerDraws(5, null)).toBe(true)
    expect(bankerDraws(6, null)).toBe(false)
  })
  it('pays 1:1, 0.95 floored, 8:1 and pushes on a tie', () => {
    expect(baccaratPayout('player', 100, 'player')).toBe(200)
    expect(baccaratPayout('banker', 100, 'banker')).toBe(195)
    expect(baccaratPayout('banker', 15, 'banker')).toBe(29) // 14.25 floored
    expect(baccaratPayout('tie', 10, 'tie')).toBe(90)
    expect(baccaratPayout('player', 10, 'tie')).toBe(10)
    expect(baccaratPayout('banker', 10, 'player')).toBe(0)
    expect(baccaratPayout('tie', 10, 'banker')).toBe(0)
  })
  it('debits all bets and returns payout without crediting', () => {
    const w = new Wallet(mem(), () => 0)
    const r = playBaccarat(w, { banker: 100, tie: 10 }, shoe(6, 2, 10, 3, 4))
    expect(w.balance).toBe(STARTING_BALANCE - 110)
    expect(r).toMatchObject({ stake: 110, payout: 195 })
    expect(() => playBaccarat(w, {}, shoe(14))).toThrow()
    expect(() => playBaccarat(w, { player: -5 }, shoe(14))).toThrow()
  })
  it('builds roadmaps', () => {
    const h = ['tie', 'banker', 'banker', 'tie', 'player', 'banker', 'tie', 'tie'] as const
    expect(bigRoad(h)).toEqual([
      [{ winner: 'banker', ties: 1 }, { winner: 'banker', ties: 1 }],
      [{ winner: 'player', ties: 0 }],
      [{ winner: 'banker', ties: 2 }],
    ])
    expect(beadPlate(h, 6).map((col) => col.length)).toEqual([6, 2])
    expect(roadStats(h)).toEqual({ player: 1, banker: 3, tie: 4 })
  })
})
