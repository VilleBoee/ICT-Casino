import { useSyncExternalStore } from 'react'
import { SettingsStore, type Settings } from '../engine'

/** App-wide settings singleton (theme, language, volume, mute), persisted in localStorage. */
export const settings = new SettingsStore()

/** React hook: re-renders when any setting changes. */
export function useSettings(): Settings {
  return useSyncExternalStore(settings.subscribe, settings.getSnapshot, settings.getSnapshot)
}
