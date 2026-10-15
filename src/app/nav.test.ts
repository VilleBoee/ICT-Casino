import { describe, expect, it } from 'vitest'
import { GAMES } from './games'
import { activeGameId, centredScroll, showNav } from './nav'
import { en } from '../i18n/en'
import { fi } from '../i18n/fi'

describe('game nav', () => {
  it('lists all 10 games, each with its own icon and an EN + FI label', () => {
    expect(GAMES).toHaveLength(10)
    expect(GAMES.map((g) => g.id)).toEqual(expect.arrayContaining(['plinko', 'pajatso']))
    expect(new Set(GAMES.map((g) => g.icon)).size).toBe(10)
    for (const g of GAMES) {
      expect((en as Record<string, string>)[`game.${g.id}.name`]).toBeTruthy()
      expect((fi as Record<string, string>)[`game.${g.id}.name`]).toBeTruthy()
    }
    expect((fi as Record<string, string>)['nav.games']).toBe('Pelit')
  })
  it('finds the active game from the hash path', () => {
    expect(activeGameId('/game/plinko')).toBe('plinko')
    expect(activeGameId('/game/nope')).toBeNull()
    expect(activeGameId('/stats')).toBeNull()
    expect(activeGameId('/')).toBeNull()
  })
  it('is hidden on the lobby only', () => {
    expect(showNav('/')).toBe(false)
    expect(showNav('/stats')).toBe(true)
    expect(showNav('/game/dice')).toBe(true)
  })
  it('centres the active item in the strip, clamped at both ends', () => {
    expect(centredScroll(360, 1200, 0, 100)).toBe(0)
    expect(centredScroll(360, 1200, 600, 100)).toBe(470)
    expect(centredScroll(360, 1200, 1100, 100)).toBe(840)
    expect(centredScroll(1200, 1000, 500, 100)).toBe(0)
  })
})
