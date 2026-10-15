import { useSyncExternalStore } from 'react'

/** Live CSS media query match (false during SSR/tests without matchMedia). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => (typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches),
    () => false,
  )
}

/** Phones: below Tailwind's `sm` breakpoint. */
export const PHONE = '(max-width: 639.98px)'
