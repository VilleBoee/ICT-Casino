import { describe, expect, it } from 'vitest'
import { totalLabel } from './format'

describe('blackjack totals', () => {
  it('shows soft totals', () => {
    expect(totalLabel([{ rank: 14, suit: 'S' }, { rank: 6, suit: 'H' }])).toBe('7/17')
    expect(totalLabel([{ rank: 14, suit: 'S' }, { rank: 13, suit: 'H' }])).toBe('21')
    expect(totalLabel([{ rank: 14, suit: 'S' }, { rank: 6, suit: 'H' }, { rank: 10, suit: 'C' }])).toBe('17')
    expect(totalLabel([{ rank: 9, suit: 'S' }, { rank: 8, suit: 'H' }])).toBe('17')
  })
})
