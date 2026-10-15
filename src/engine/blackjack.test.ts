import { describe, it, expect } from 'vitest'
import { BlackjackRound, handTotal } from './blackjack'
import { Shoe } from './cards'
import { Wallet, STARTING_BALANCE } from './wallet'
import type { Card, Rank } from './types'

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }
const c = (...ranks: Rank[]): Card[] => ranks.map((rank) => ({ rank, suit: 'S' }))
// Deal order: player, dealer, player, dealer, then hits
const round = (ranks: Rank[], bet = 100) => { const w = new Wallet(mem(), () => 0); return { w, r: new BlackjackRound(w, bet, Shoe.stacked(c(...ranks))) } }

describe('blackjack', () => {
  it('totals soft hands', () => {
    expect(handTotal(c(14, 6))).toEqual({ total: 17, soft: true })
    expect(handTotal(c(14, 6, 10))).toEqual({ total: 17, soft: false })
    expect(handTotal(c(14, 14, 9))).toEqual({ total: 21, soft: true })
  })
  it('natural pays 3:2 and finishes immediately', () => {
    const { w, r } = round([14, 9, 13, 7])
    expect(r.state.phase).toBe('done')
    expect(w.balance).toBe(STARTING_BALANCE - 100)
    expect(r.result().payout).toBe(250)
  })
  it('dealer stands on soft 17', () => {
    const { r } = round([10, 14, 8, 6])
    r.act('stand')
    expect(r.state.dealer.length).toBe(2)
    expect(r.result().outcome.results[0].result).toBe('win')
  })
  it('double debits and draws one card', () => {
    const { w, r } = round([5, 10, 6, 7, 10])
    r.act('double')
    expect(w.balance).toBe(STARTING_BALANCE - 200)
    expect(r.result().payout).toBe(400)
  })
  it('split creates two hands, 21 after split is not blackjack', () => {
    const { r } = round([8, 10, 8, 7, 3, 10])
    r.act('split')
    expect(r.state.hands.length).toBe(2)
    r.act('stand'); r.act('stand')
    expect(r.result().outcome.results.map((x) => x.result)).toEqual(['lose', 'win'])
  })
  it('split aces get one card each', () => {
    const { r } = round([14, 10, 14, 7, 13, 9])
    r.act('split')
    expect(r.state.phase).toBe('done')
    expect(r.result().outcome.results.map((x) => x.result)).toEqual(['win', 'win'])
    expect(r.result().payout).toBe(400) // 21 on split aces pays 1:1, not 3:2
  })
  it('bust loses without dealer drawing', () => {
    const { r } = round([10, 10, 6, 6, 10])
    r.act('hit')
    expect(r.state.dealer.length).toBe(2)
    expect(r.result().payout).toBe(0)
  })
})
