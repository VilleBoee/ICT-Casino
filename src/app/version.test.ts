import { describe, expect, it } from 'vitest'

describe('app version', () => {
  it('__APP_VERSION__ is injected from package.json', () => {
    expect(__APP_VERSION__).toMatch(/^\d+\.\d+\.\d+/)
    expect(__APP_VERSION__).toBe('0.1.0')
  })
})
