import { settings } from './settings'
import type { Settings } from '../engine'

/** Reflect the theme on <html data-theme>, so the CSS variables in index.css switch palettes. */
export function applyTheme(s: Settings = settings.get(), root: HTMLElement = document.documentElement) {
  root.dataset.theme = s.theme
  if (typeof document !== 'undefined') document.querySelector('meta[name="theme-color"]')?.setAttribute('content', s.theme === 'light' ? '#f6f8fa' : '#07090a')
}

/** Call once at startup (before the first render, so there's no flash), then follows the settings store. */
export function installTheme(): () => void {
  applyTheme()
  return settings.subscribe((s) => applyTheme(s))
}
