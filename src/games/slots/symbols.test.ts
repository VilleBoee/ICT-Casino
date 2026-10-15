import { describe, expect, it } from 'vitest'
import { evaluateGrid, rollSlots, PAYLINES, type SlotSymbol } from '../../engine/slots'
import { buildStrip, linePoints, winningCells } from './symbols'

describe('slots UI helpers', () => {
  it('reel strip always ends on the engine rows', () => {
    for (let i = 0; i < 50; i++) {
      const { outcome } = rollSlots(1)
      outcome.grid.forEach((rows, reel) => {
        const strip = buildStrip(rows, 12 + reel * 4)
        expect(strip.slice(-3)).toEqual(rows)
        expect(strip.length).toBe(15 + reel * 4)
      })
    }
  })
  it('marks only matched cells of winning lines', () => {
    const g: SlotSymbol[][] = Array.from({ length: 5 }, (_, r) => [r % 2 ? 'bug' : 'coffee', r < 3 ? 'root' : 'cpu', r % 2 ? 'git' : 'cloud'])
    const wins = evaluateGrid(g, 1)
    expect(wins.map((w) => w.line)).toEqual([0])
    expect([...winningCells(wins)].sort()).toEqual(['0:1', '1:1', '2:1'])
  })
  it('draws paylines through cell centres', () => {
    expect(linePoints(3)).toBe('50,50 150,150 250,250 350,150 450,50')
    expect(PAYLINES).toHaveLength(10)
  })
})
