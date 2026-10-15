import { describe, it, expect } from 'vitest'
import { bestHand, evaluate } from './poker'
import { newDeck } from './cards'
import { seededRng, shuffle } from './rng'
import type { Card } from './types'

const R: Record<string, number> = { T: 10, J: 11, Q: 12, K: 13, A: 14 }
const h = (s: string): Card[] => s.split(' ').map((t) => ({ rank: (R[t[0]] ?? Number(t[0])) as Card['rank'], suit: t[1] as Card['suit'] }))
const str = (cs: Card[]) => cs.map((c) => `${Object.keys(R).find((k) => R[k] === c.rank) ?? c.rank}${c.suit}`).join(' ')

describe('bestHand', () => {
  it('preflop', () => {
    expect(bestHand(h('KS KH')).label).toBe('Pair of Kings')
    const hc = bestHand(h('AS 7D'))
    expect(hc.label).toBe('High Card, Ace'); expect(str(hc.cards)).toBe('AS'); expect(str(hc.kickers)).toBe('7D')
  })
  it('flop, turn and river labels with highlighted cards', () => {
    const p = bestHand(h('KS 9H KD 4C 2S'))
    expect(p.label).toBe('Pair of Kings'); expect(str(p.cards)).toBe('KS KD'); expect(str(p.kickers)).toBe('9H 4C 2S')
    const tp = bestHand(h('AS 8H AD 8C 2S 3D'))
    expect(tp.label).toBe('Two Pair, Aces and Eights'); expect(tp.cards).toHaveLength(4); expect(str(tp.kickers)).toBe('3D')
    const fh = bestHand(h('QS QH QD 7C 7S 2D AH'))
    expect(fh.label).toBe('Full House, Queens over Sevens'); expect(fh.cards).toHaveLength(5)
    expect(bestHand(h('AH KH 2H 7H 9H 3C')).label).toBe('Flush, Ace high')
    expect(bestHand(h('TS JH QD KC AS 2D 2C')).label).toBe('Straight, Ace high')
    expect(bestHand(h('TH JH QH KH AH 2D 2C')).label).toBe('Royal Flush')
    expect(bestHand(h('9S 9H 9D 9C 2S')).label).toBe('Four of a Kind, Nines')
    expect(bestHand(h('3S 3H 3D 8C')).label).toBe('Three of a Kind, Threes')
  })
  it('wheel straight lists the ace last', () => {
    const w = bestHand(h('AS 2H 3D 4C 5S KD'))
    expect(w.label).toBe('Straight, Five high'); expect(str(w.cards)).toBe('5S 4C 3D 2H AS')
  })
  it('matches the 7-card evaluator on random deals', () => {
    const rng = seededRng(76)
    for (let i = 0; i < 2000; i++) {
      const n = 5 + (i % 3)
      const cards = shuffle(newDeck(), rng).slice(0, n)
      const b = bestHand(cards)
      expect(b.score).toBe(evaluate(cards).score)
      expect(b.cards.length + b.kickers.length).toBe(5)
      expect([...b.cards, ...b.kickers].every((c) => cards.includes(c))).toBe(true)
    }
  })
})
