import { describe, expect, it } from 'vitest'
import { normalize, href } from './router'

describe('hash router', () => {
  it('normalizes paths', () => {
    expect(normalize('')).toBe('/')
    expect(normalize('/game/roulette/')).toBe('/game/roulette')
    expect(normalize('game//dice?x=1')).toBe('/game/dice')
    expect(href('dev')).toBe('#/dev')
  })
})
