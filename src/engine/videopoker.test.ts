import { describe, it, expect } from 'vitest'
import { VideoPokerRound, classifyVp, VP_PAYTABLE, VP_MAX_COINS, vpPaytable } from './videopoker'
import { Wallet, STARTING_BALANCE } from './wallet'
import { seededRng } from './rng'
import { newDeck } from './cards'
import type { Card, Rank, Suit } from './types'

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }
const RANK: Record<string, Rank> = { T: 10, J: 11, Q: 12, K: 13, A: 14 }
const h = (s: string): Card[] => s.split(' ').map((t) => ({ rank: (RANK[t[0]] ?? Number(t[0])) as Rank, suit: t[1].toUpperCase() as Suit }))
/** Deck whose first cards are `top`, rest of a fresh deck after. */
const stacked = (top: string) => { const t = h(top); const key = (c: Card) => c.rank + c.suit; return [...t, ...newDeck().filter((c) => !t.some((x) => key(x) === key(c)))] }

describe('video poker', () => {
  it.each([
    ['As Ks Qs Js Ts', 'Royal Flush'], ['9h 8h 7h 6h 5h', 'Straight Flush'], ['5d 5c 5h 5s Kd', 'Four of a Kind'],
    ['Kd Kc Kh 2s 2d', 'Full House'], ['2h 7h 9h Jh Kh', 'Flush'], ['Ad 2c 3h 4s 5d', 'Straight'],
    ['7d 7c 7h As Kd', 'Three of a Kind'], ['7d 7c 2h 2s Kd', 'Two Pair'], ['Jd Jc 2h 9s 3d', 'Jacks or Better'],
    ['Ad Ac 2h 9s 3d', 'Jacks or Better'], ['Td Tc 2h 9s 3d', 'Nothing'], ['Ad Kc 2h 9s 3d', 'Nothing'],
  ])('%s is %s', (c, name) => expect(classifyVp(h(c))).toBe(name))

  it('is the 9/6 full pay table', () => {
    expect(VP_PAYTABLE['Full House']).toBe(9)
    expect(VP_PAYTABLE.Flush).toBe(6)
    expect(VP_PAYTABLE['Royal Flush']).toBe(250)
  })

  it('max-coin royal bonus: 250/coin for 1-4 coins, 4000 for 5', () => {
    expect(VP_MAX_COINS).toBe(5)
    expect([1, 2, 3, 4, 5].map((c) => vpPaytable(c)['Royal Flush'])).toEqual([250, 500, 750, 1000, 4000])
    expect([1, 5].map((c) => vpPaytable(c)['Full House'])).toEqual([9, 45])
    expect(() => vpPaytable(0)).toThrow()
    expect(() => vpPaytable(6)).toThrow()
  })

  it('debits on deal, holds and draws', () => {
    const w = new Wallet(mem(), () => 0)
    const r = new VideoPokerRound(w, { coins: 5, coinSize: 2 }, seededRng(1), stacked('Jd Jc 2h 9s 3d Js 4c 8d'))
    expect(w.balance).toBe(STARTING_BALANCE - 10)
    expect(r.currentHand).toBe('Jacks or Better')
    r.toggleHold(0); r.toggleHold(1); r.toggleHold(4); r.toggleHold(4)
    const res = r.draw()
    expect(res.outcome.cards.map((c) => c.rank + c.suit)).toEqual(['11D', '11C', '11S', '4C', '8D'])
    expect(res.outcome.hand).toBe('Three of a Kind')
    expect(res.payout).toBe(30)
    expect(res.outcome).toMatchObject({ coins: 5, coinSize: 2, coinsWon: 15, multiplier: 3 })
    expect(w.balance).toBe(STARTING_BALANCE - 10) // not credited
    expect(() => r.draw()).toThrow()
    expect(() => r.toggleHold(0)).toThrow()
  })

  it('holding all keeps the hand, drawing all replaces it', () => {
    const w = new Wallet(mem(), () => 0)
    const royal = (coins: number) => { const r = new VideoPokerRound(w, { coins, coinSize: 3 }, seededRng(1), stacked('As Ks Qs Js Ts')); r.setHolds([true, true, true, true, true]); return r.draw() }
    expect(royal(5)).toMatchObject({ stake: 15, payout: 12000 })
    expect(royal(4)).toMatchObject({ stake: 12, payout: 3000 })
    const all = new VideoPokerRound(w, { coins: 1, coinSize: 1 }, seededRng(1), stacked('As Ks Qs Js Ts 2c 3d 7h 8s 9c'))
    expect(all.draw().outcome.hand).toBe('Nothing')
  })

  it('deals 10 unique cards with a seeded deck', () => {
    const r = new VideoPokerRound(new Wallet(mem(), () => 0), { coins: 1, coinSize: 1 }, seededRng(5))
    const res = r.draw()
    expect(new Set([...res.outcome.cards].map((c) => c.rank + c.suit)).size).toBe(5)
    expect(() => new VideoPokerRound(new Wallet(mem(), () => 0), { coins: 0, coinSize: 1 })).toThrow()
    expect(() => new VideoPokerRound(new Wallet(mem(), () => 0), { coins: 1, coinSize: 0.5 })).toThrow()
  })
})
