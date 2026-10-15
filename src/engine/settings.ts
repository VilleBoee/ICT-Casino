import type { Storage } from './wallet'

export const SETTINGS_KEY = 'ict-casino:settings'
/** Legacy key written by src/app/sound.ts; migrated once if present. */
export const LEGACY_MUTE_KEY = 'ict-casino:muted'

export type Theme = 'dark' | 'light'
export type Lang = 'fi' | 'en'
export interface Settings {
  version: 1
  theme: Theme
  lang: Lang
  /** Master volume 0..1. */
  volume: number
  muted: boolean
}
export type SettingsPatch = Partial<Omit<Settings, 'version'>>

/** Default master volume, lower than before (#74). */
export const DEFAULT_VOLUME = 0.4

export interface Env { prefersLight?: boolean; languages?: readonly string[] }

/** Browser defaults: OS colour scheme, and Finnish if the browser prefers it. */
export function defaultSettings(env: Env = {}): Settings {
  const fi = (env.languages ?? []).some((l) => l.toLowerCase().startsWith('fi'))
  return { version: 1, theme: env.prefersLight ? 'light' : 'dark', lang: fi ? 'fi' : 'en', volume: DEFAULT_VOLUME, muted: false }
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** Keeps valid fields from untrusted input, falling back to `base` for the rest. */
export function sanitize(input: unknown, base: Settings): Settings {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  return {
    version: 1,
    theme: o.theme === 'light' || o.theme === 'dark' ? o.theme : base.theme,
    lang: o.lang === 'fi' || o.lang === 'en' ? o.lang : base.lang,
    volume: typeof o.volume === 'number' && Number.isFinite(o.volume) ? clamp01(o.volume) : base.volume,
    muted: typeof o.muted === 'boolean' ? o.muted : base.muted,
  }
}

function browserEnv(): Env {
  if (typeof window === 'undefined') return {}
  return {
    prefersLight: !!window.matchMedia?.('(prefers-color-scheme: light)').matches,
    languages: navigator.languages ?? [navigator.language],
  }
}

function browserStorage(): Storage | null {
  try { localStorage.setItem('__s', '1'); localStorage.removeItem('__s'); return localStorage } catch { return null }
}

export class SettingsStore {
  private state: Settings
  private storage: Storage | null
  private listeners = new Set<(s: Settings) => void>()

  constructor(storage: Storage | null = browserStorage(), env: Env = browserEnv()) {
    this.storage = storage
    const defaults = defaultSettings(env)
    let raw: string | null = null
    try { raw = storage?.getItem(SETTINGS_KEY) ?? null } catch { /* unavailable */ }
    if (raw !== null) {
      let parsed: unknown = null
      try { parsed = JSON.parse(raw) } catch { /* corrupt */ }
      const ok = parsed && typeof parsed === 'object' && (parsed as { version?: unknown }).version === 1
      this.state = ok ? sanitize(parsed, defaults) : defaults
    } else {
      let legacy: string | null = null
      try { legacy = storage?.getItem(LEGACY_MUTE_KEY) ?? null } catch { /* unavailable */ }
      this.state = legacy === null ? defaults : { ...defaults, muted: legacy === '1' }
    }
  }

  get(): Settings { return this.state }
  /** Stable snapshot for useSyncExternalStore. */
  getSnapshot = (): Settings => this.state

  subscribe = (fn: (s: Settings) => void): (() => void) => {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  update(patch: SettingsPatch): Settings {
    const next = sanitize({ ...this.state, ...patch }, this.state)
    const changed = (Object.keys(next) as (keyof Settings)[]).some((k) => next[k] !== this.state[k])
    if (!changed) return this.state
    this.state = next
    try { this.storage?.setItem(SETTINGS_KEY, JSON.stringify(next)) } catch { /* keep in memory */ }
    this.listeners.forEach((l) => l(next))
    return next
  }

  setTheme(theme: Theme) { return this.update({ theme }) }
  toggleTheme() { return this.update({ theme: this.state.theme === 'dark' ? 'light' : 'dark' }) }
  setLang(lang: Lang) { return this.update({ lang }) }
  toggleLang() { return this.update({ lang: this.state.lang === 'fi' ? 'en' : 'fi' }) }
  setVolume(volume: number) { return this.update({ volume }) }
  setMuted(muted: boolean) { return this.update({ muted }) }
  toggleMuted() { return this.update({ muted: !this.state.muted }) }
  reset() {
    const d = defaultSettings(browserEnv())
    return this.update(d)
  }

  /** Effective gain for one sound: master volume x per-sound level, or 0 when muted. */
  gain(level = 1): number { return this.state.muted ? 0 : clamp01(this.state.volume * level) }
}
