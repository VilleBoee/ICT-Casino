import { motion, useReducedMotion } from 'framer-motion'
import { GAMES, gameName, gameTagline } from '../app/games'
import { href } from '../app/router'
import { useT } from '../i18n'

export default function Lobby() {
  const reduce = useReducedMotion()
  const t = useT()
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="font-mono text-sm text-muted">
          <span className="text-neon">ville@ict</span>:<span className="text-cyan">~/casino</span>$ ls games/
        </p>
        <h1>{t('lobby.title')}</h1>
        <p className="text-muted">{t('lobby.intro')} <a href={href('/stats')} className="inline-flex min-h-11 items-center">{t('lobby.stats')}</a></p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {GAMES.map((g, i) => (
          <motion.li
            key={g.id}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : { delay: i * 0.04 }}
          >
            <a
              href={href(`/game/${g.id}`)}
              className="panel group flex h-full flex-col gap-3 text-fg no-underline transition-shadow hover:no-underline hover:shadow-glow-neon focus-visible:shadow-glow-neon"
            >
              <span className="flex items-start justify-between">
                <span className="font-mono text-3xl text-neon" aria-hidden>{g.icon}</span>
                {!g.ready && (
                  <span className="rounded border border-warn/50 px-1.5 py-0.5 font-mono text-[10px] uppercase text-warn">{t('lobby.soon')}</span>
                )}
              </span>
              <span className="font-mono text-lg font-semibold group-hover:text-neon">{gameName(t, g.id)}</span>
              <span className="text-sm text-muted">{gameTagline(t, g.id)}</span>
            </a>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}
