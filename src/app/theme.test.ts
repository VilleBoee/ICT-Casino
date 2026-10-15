import { describe, expect, it } from 'vitest'
import { applyTheme } from './theme'
import { defaultSettings } from '../engine'

describe('applyTheme', () => {
  it('sets data-theme on the root element', () => {
    const root = { dataset: {} as Record<string, string> } as unknown as HTMLElement
    applyTheme({ ...defaultSettings(), theme: 'light' }, root)
    expect(root.dataset.theme).toBe('light')
    applyTheme({ ...defaultSettings(), theme: 'dark' }, root)
    expect(root.dataset.theme).toBe('dark')
  })
})
