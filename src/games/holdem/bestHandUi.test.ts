import { describe, expect, it } from 'vitest'
import type { Card } from '../../engine'
import { glows, handLabel, liveBest } from './bestHandUi'

const c = (s: string): Card => {
  const r = s.slice(0, -1), suit = s.slice(-1) as Card['suit']
  const rank = ({ A: 14, K: 13, Q: 12, J: 11, T: 10 } as Record<string, number>)[r] ?? Number(r)
  return { rank, suit } as Card
}
const cs = (s: string) => s.split(' ').map(c)

describe('live best hand (Hold\'em)', () => {
  it('preflop: pair or high card', () => {
    expect(liveBest(cs('KD KS'), [])!.label).toBe('Pair of Kings')
    expect(handLabel(liveBest(cs('KD KS'), [])!, 'fi')).toBe('Pari, kuninkaat')
    expect(handLabel(liveBest(cs('AH 7C'), [])!, 'fi')).toBe('Hai, ässä')
  })
  it('updates per street and builds Finnish text from category + ranks', () => {
    const hole = cs('AH 8D')
    expect(handLabel(liveBest(hole, cs('AS 8C 2D'))!, 'en')).toBe('Two Pair, Aces and Eights')
    expect(handLabel(liveBest(hole, cs('AS 8C 2D'))!, 'fi')).toBe('Kaksi paria, ässät ja kasit')
    expect(handLabel(liveBest(hole, cs('AS 8C 2D AC'))!, 'fi')).toBe('Täyskäsi, ässät ja kasit')
    expect(handLabel(liveBest(cs('TH JH'), cs('QH KH AH 2C 3D'))!, 'fi')).toBe('Kuningasvärisuora')
    expect(handLabel(liveBest(cs('5H 6C'), cs('7D 8S 9H'))!, 'fi')).toBe('Suora, ysi korkein')
  })
  it('glows only the category cards, and only from the flop', () => {
    const hole = cs('KD 4C'), board = cs('KS 9H 2D')
    const best = liveBest(hole, board)
    expect(glows(best, board, c('KD'))).toBe(true)
    expect(glows(best, board, c('KS'))).toBe(true)
    expect(glows(best, board, c('4C'))).toBe(false)
    expect(glows(liveBest(cs('KD KS'), []), [], c('KD'))).toBe(false)
  })
  it('no hand without hole cards', () => {
    expect(liveBest([], [])).toBeNull()
  })
})
