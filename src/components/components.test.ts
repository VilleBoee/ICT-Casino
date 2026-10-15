import { describe, expect, it } from 'vitest'
import { toChips } from './Chip'
import { resultKind } from './ResultToast'
import { cardLabel, rankLabel } from './PlayingCard'

describe('component helpers', () => {
  it('splits amounts into chips', () => {
    expect(toChips(1631)).toEqual([1000, 500, 100, 25, 5, 1])
    expect(toChips(0)).toEqual([])
  })
  it('derives result kind', () => {
    expect(resultKind({ stake: 10, payout: 25 })).toBe('win')
    expect(resultKind({ stake: 10, payout: 10 })).toBe('push')
    expect(resultKind({ stake: 10, payout: 0 })).toBe('lose')
  })
  it('labels cards', () => {
    expect(rankLabel(14)).toBe('A')
    expect(cardLabel({ rank: 12, suit: 'H' })).toBe('queen of hearts')
  })
})
