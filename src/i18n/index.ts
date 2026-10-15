import { useCallback } from 'react'
import type { Lang } from '../engine'
import { settings, useSettings } from '../app/settings'
import { en, type Key } from './en'
import { fi } from './fi'

export type { Key }
export type Vars = Record<string, string | number>
export const DICTS: Record<Lang, Record<Key, string>> = { en, fi }

/** Interpolates `{name}` placeholders. Missing keys fall back to English, then to the key itself. */
export function translate(lang: Lang, key: Key, vars?: Vars): string {
  const s = DICTS[lang][key] ?? en[key] ?? key
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s
}

/** Non-React callers: translate in the current language. */
export const t = (key: Key, vars?: Vars) => translate(settings.get().lang, key, vars)

export type T = (key: Key, vars?: Vars) => string
/** React hook: a t() bound to the current language; re-renders on language change. */
export function useT(): T {
  const { lang } = useSettings()
  return useCallback((key: Key, vars?: Vars) => translate(lang, key, vars), [lang])
}

/** Keep <html lang> in sync with the setting (call once at startup). */
export function installLang(root: HTMLElement = document.documentElement): () => void {
  root.lang = settings.get().lang
  return settings.subscribe((s) => { root.lang = s.lang })
}
