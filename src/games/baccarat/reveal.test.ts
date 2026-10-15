import { describe, expect, it } from 'vitest'
import { dealCoup } from '../../engine/baccarat'
import { Shoe } from '../../engine/cards'
import type { Card } from '../../engine/types'
import { revealSteps, visibleAfter } from './reveal'

const c = (rank: Card['rank']): Card => ({ rank, suit: 'S' })

describe('baccarat reveal order', () => {
  it('two each alternating, then player third, then banker third', () => {
    // P: 2,3 (5 → draws 4) ; B: 10,3 (3, player third 4 → draws)
    const coup = dealCoup(Shoe.stacked([c(2), c(10), c(3), c(3), c(4), c(5)]))
    expect(coup.player).toHaveLength(3)
    expect(coup.banker).toHaveLength(3)
    expect(revealSteps(coup)).toEqual([
      { side: 'player', index: 0 }, { side: 'banker', index: 0 }, { side: 'player', index: 1 },
      { side: 'banker', index: 1 }, { side: 'player', index: 2 }, { side: 'banker', index: 2 },
    ])
    const mid = visibleAfter(coup, 4)
    expect(mid.playerTotal).toBe(5)
    expect(mid.bankerTotal).toBe(3)
    const end = visibleAfter(coup, 6)
    expect(end.playerTotal).toBe(coup.playerTotal)
    expect(end.bankerTotal).toBe(coup.bankerTotal)
  })
  it('banker-only third card comes after the four', () => {
    // P: 10,7 (7 stands) ; B: 10,2 (2 → draws)
    const coup = dealCoup(Shoe.stacked([c(10), c(10), c(7), c(2), c(9)]))
    expect(revealSteps(coup).slice(4)).toEqual([{ side: 'banker', index: 2 }])
  })
  it('naturals stop at four', () => {
    const coup = dealCoup(Shoe.stacked([c(4), c(2), c(5), c(3)]))
    expect(coup.natural).toBe(true)
    expect(revealSteps(coup)).toHaveLength(4)
    expect(visibleAfter(coup, 0).playerTotal).toBeNull()
  })
})
