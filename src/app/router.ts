import { useSyncExternalStore } from 'react'

/** Tiny hash router: GitHub Pages serves only index.html, so routes live after `#`. */
const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
export const currentPath = () => normalize(window.location.hash.replace(/^#/, ''))
export const normalize = (p: string) => '/' + p.split('?')[0].split('/').filter(Boolean).join('/')

export function usePath(): string {
  return useSyncExternalStore(subscribe, currentPath, () => '/')
}
export const href = (path: string) => `#${normalize(path)}`
export function navigate(path: string) { window.location.hash = normalize(path) }
