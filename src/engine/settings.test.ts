import { describe, it, expect, vi } from 'vitest'
import { SettingsStore, SETTINGS_KEY, LEGACY_MUTE_KEY, DEFAULT_VOLUME, defaultSettings } from './settings'

const mem = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init))
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}

describe('settings', () => {
  it('defaults follow the browser', () => {
    expect(defaultSettings({ prefersLight: true, languages: ['fi-FI', 'en'] })).toMatchObject({ theme: 'light', lang: 'fi', volume: DEFAULT_VOLUME, muted: false })
    expect(defaultSettings({ languages: ['en-US'] })).toMatchObject({ theme: 'dark', lang: 'en' })
  })
  it('persists and reloads', () => {
    const s = mem()
    const a = new SettingsStore(s, {})
    a.toggleTheme(); a.setLang('fi'); a.setVolume(0.25)
    expect(new SettingsStore(s, {}).get()).toMatchObject({ theme: 'light', lang: 'fi', volume: 0.25 })
  })
  it('clamps and validates input', () => {
    const a = new SettingsStore(mem(), {})
    a.setVolume(5); expect(a.get().volume).toBe(1)
    a.setVolume(-1); expect(a.get().volume).toBe(0)
    a.update({ theme: 'neon' as never, volume: NaN }); expect(a.get()).toMatchObject({ theme: 'dark', volume: 0 })
  })
  it('migrates the old mute key once', () => {
    const s = mem({ [LEGACY_MUTE_KEY]: '1' })
    expect(new SettingsStore(s, {}).get().muted).toBe(true)
    const s2 = mem({ [LEGACY_MUTE_KEY]: '1', [SETTINGS_KEY]: JSON.stringify({ version: 1, muted: false }) })
    expect(new SettingsStore(s2, {}).get().muted).toBe(false)
  })
  it('survives corrupt or wrong-version data', () => {
    expect(new SettingsStore(mem({ [SETTINGS_KEY]: '{oops' }), { languages: ['fi'] }).get().lang).toBe('fi')
    expect(new SettingsStore(mem({ [SETTINGS_KEY]: JSON.stringify({ version: 9, theme: 'light' }) }), {}).get().theme).toBe('dark')
    expect(new SettingsStore(mem({ [SETTINGS_KEY]: JSON.stringify({ version: 1, theme: 'light', lang: 42 }) }), {}).get()).toMatchObject({ theme: 'light', lang: 'en' })
  })
  it('works without storage and when storage throws', () => {
    const a = new SettingsStore(null, {})
    a.setLang('fi'); expect(a.get().lang).toBe('fi')
    const bad = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('quota') } }
    const b = new SettingsStore(bad, {})
    b.toggleTheme(); expect(b.get().theme).toBe('light')
  })
  it('notifies only on real changes, with stable snapshots', () => {
    const a = new SettingsStore(mem(), {})
    const fn = vi.fn()
    const off = a.subscribe(fn)
    const snap = a.getSnapshot()
    a.setTheme('dark')
    expect(fn).not.toHaveBeenCalled(); expect(a.getSnapshot()).toBe(snap)
    a.toggleLang(); expect(fn).toHaveBeenCalledTimes(1)
    off(); a.toggleLang(); expect(fn).toHaveBeenCalledTimes(1)
  })
  it('gain combines master volume, level and mute', () => {
    const a = new SettingsStore(mem(), {})
    a.setVolume(0.5)
    expect(a.gain(0.6)).toBeCloseTo(0.3)
    a.toggleMuted(); expect(a.gain(1)).toBe(0)
  })
})
