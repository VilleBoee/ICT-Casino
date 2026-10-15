import { describe, expect, it } from 'vitest'
import { VideoPokerRound } from '../../engine/videopoker'
import { Wallet } from '../../engine/wallet'
import type { Card } from '../../engine/types'
import { VP_ROWS, holdKey, payFor } from './paytable'

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }

describe('video poker UI helpers', () => {
  it('rows are ordered best first and pay per coin', () => {
    expect(VP_ROWS[0]).toBe('Royal Flush')
    expect(VP_ROWS.at(-1)).toBe('Jacks or Better')
    expect(VP_ROWS).not.toContain('Nothing')
    expect(payFor('Full House', 5)).toBe(45)
    expect(payFor('Royal Flush', 5)).toBe(4000)
    expect(payFor('Royal Flush', 4)).toBe(1000)
  })
  it('maps keys 1-5', () => {
    expect(holdKey('1')).toBe(0)
    expect(holdKey('5')).toBe(4)
    expect(holdKey('6')).toBeNull()
    expect(holdKey('a')).toBeNull()
  })
  it('draw replaces only unheld cards (UI contract)', () => {
    const deck: Card[] = Array.from({ length: 10 }, (_, i) => ({ rank: (i + 2) as Card['rank'], suit: 'S' }))
    const w = new Wallet(mem())
    const r = new VideoPokerRound(w, { coins: 5, coinSize: 1 }, undefined, deck)
    const before = [...r.cards]
    r.toggleHold(0); r.toggleHold(3)
    const res = r.draw()
    expect(res.outcome.cards[0]).toEqual(before[0])
    expect(res.outcome.cards[3]).toEqual(before[3])
    expect(res.outcome.cards[1]).not.toEqual(before[1])
  })
})
