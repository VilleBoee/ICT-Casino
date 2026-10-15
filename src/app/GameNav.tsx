import { useLayoutEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { GAMES, gameName } from './games'
import { href } from './router'
import { activeGameId, centredScroll } from './nav'
import { useT } from '../i18n'

/** Every game: a snap-scrolling strip on narrow screens, a full bar on desktop. */
export function GameNav({ path }: { path: string }) {
  const t = useT()
  const reduce = useReducedMotion()
  const active = activeGameId(path)
  const strip = useRef<HTMLUListElement>(null)

  // keep the active game visible in the strip (scrolls only the strip, never the page)
  useLayoutEffect(() => {
    const ul = strip.current
    const li = ul?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!ul || !li) return
    const left = centredScroll(ul.clientWidth, ul.scrollWidth, li.offsetLeft, li.offsetWidth)
    if (typeof ul.scrollTo === 'function') ul.scrollTo({ left, behavior: reduce ? 'auto' : 'smooth' })
  }, [active, reduce])

  return (
    <nav aria-label={t('nav.games')} className="border-t border-border/60">
      <ul ref={strip}
        className="nav-strip mx-auto flex max-w-6xl snap-x snap-mandatory gap-1 overflow-x-auto scroll-px-3 px-3 py-1 lg:snap-none lg:justify-between lg:overflow-visible lg:px-4">
        {GAMES.map((g) => {
          const on = g.id === active
          return (
            <li key={g.id} className="shrink-0 snap-start">
              <a href={href(`/game/${g.id}`)} aria-current={on ? 'page' : undefined}
                className={`relative flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-md px-3 font-mono text-xs no-underline outline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-neon ${on ? 'text-neon' : 'text-muted hover:text-fg'}`}>
                {on && (reduce
                  ? <span aria-hidden className="absolute inset-x-2 bottom-1 h-0.5 rounded bg-neon shadow-glow-neon" />
                  : <motion.span aria-hidden layoutId="nav-active" className="absolute inset-x-2 bottom-1 h-0.5 rounded bg-neon shadow-glow-neon"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }} />)}
                <span aria-hidden className="text-sm">{g.icon}</span>
                <span>{gameName(t, g.id)}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
