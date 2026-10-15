import { CountUp } from '../components'
import { DAILY_REFILL } from '../engine'
import { href } from './router'
import { useWallet } from './wallet'
import { useSound } from './sound'
import { useT } from '../i18n'
import { settings, useSettings } from './settings'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { PHONE, useMediaQuery } from './useMediaQuery'
import { GameNav } from './GameNav'
import { showNav } from './nav'

export function TopBar({ path = '/' }: { path?: string }) {
  const t = useT()
  const { lang, theme } = useSettings()
  const { balance, canRefill, wallet } = useWallet()
  const { muted, volume, toggleMute, setVolume } = useSound()
  const phone = useMediaQuery(PHONE)
  const controls = (
    <>
          <a href={href('/stats')} className="btn-ghost whitespace-nowrap px-2 no-underline pointer-coarse:py-2.5 sm:px-3" title={t('top.statsTitle')}>{t('top.stats')}</a>
          <button
            type="button"
            className="btn-ghost whitespace-nowrap px-2 sm:px-3"
            disabled={!canRefill}
            aria-label={canRefill ? t('top.refillAria', { n: DAILY_REFILL }) : t('top.refillDone')}
            onClick={() => wallet.refill()}
            title={canRefill ? t('top.refillTitle', { n: DAILY_REFILL }) : t('top.refillDone')}
          >
            {canRefill ? <>+{DAILY_REFILL}<span className="hidden sm:inline">{t('top.daily')}</span></> : <><span className="hidden sm:inline">{t('top.refill')}</span>✓</>}
          </button>
          <button
            type="button"
            className="btn-ghost px-2 font-mono text-xs sm:px-3"
            lang={lang === 'fi' ? 'en' : 'fi'}
            aria-label={t('top.langAria')}
            title={t('top.lang')}
            onClick={() => settings.toggleLang()}
          >
            {lang === 'fi' ? 'EN' : 'FI'}
          </button>
          <button
            type="button"
            className="btn-ghost px-2 sm:px-3"
            aria-label={theme === 'dark' ? t('top.toLight') : t('top.toDark')}
            title={theme === 'dark' ? t('top.light') : t('top.dark')}
            onClick={() => settings.toggleTheme()}
          >
            <span aria-hidden>{theme === 'dark' ? '☀' : '☾'}</span>
          </button>
          <button
            type="button"
            className="btn-ghost px-2 sm:px-3"
            aria-pressed={!muted}
            aria-label={muted ? t('top.unmute') : t('top.mute')}
            onClick={toggleMute}
            data-sfx="none"
            title={muted ? t('top.soundOff') : t('top.soundOn')}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <input
            type="range" min={0} max={100} step={5}
            value={Math.round(volume * 100)}
            onChange={(e) => { setVolume(Number(e.target.value) / 100); if (muted && Number(e.target.value) > 0) toggleMute() }}
            aria-label={t('top.volume')}
            aria-valuetext={`${Math.round(volume * 100)}%`}
            title={t('top.volumeTitle', { n: Math.round(volume * 100) })}
            className={phone ? "col-span-2 min-h-11 w-full accent-neon" : "hidden w-20 accent-neon md:block"}
          />
    </>
  )
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-nowrap items-center gap-2 px-3 py-1.5 sm:gap-4 sm:px-4 sm:py-3">
        <a href={href('/')} className="shrink-0 py-0 font-mono text-base font-extrabold pointer-coarse:py-2.5 text-fg no-underline hover:no-underline sm:text-lg">
          ICT<span className="text-neon text-glow">_</span>Casino
        </a>
        <span className="shrink-0 -ml-1 font-mono text-[10px] text-muted sm:-ml-2 sm:text-xs" title={`ICT_Casino v${__APP_VERSION__}`}>v{__APP_VERSION__}</span>
        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-3">
          {phone ? <PhoneMenu label={t('top.menu')}>{controls}</PhoneMenu> : controls}
          <div className="whitespace-nowrap rounded-md border border-neon/40 bg-surface px-2 py-1 shadow-glow-neon sm:px-3 sm:py-1.5" aria-live="polite">
            <span className="font-mono text-xs text-muted">$ </span>
            <CountUp value={balance} className="num text-lg font-semibold text-neon" />
            <span className="sr-only">{t('top.balance', { n: balance })}</span>
          </div>
        </div>
      </div>
      {showNav(path) && <GameNav path={path} />}
    </header>
  )
}

/** Phones: the secondary controls live behind one 44px button so the header stays one row. */
function PhoneMenu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const off = (e: Event) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', off); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', off); document.removeEventListener('keydown', esc) }
  }, [open])
  return (
    <div ref={box} className="relative order-last">
      <button type="button" className="btn-ghost min-h-11 min-w-11 px-2" aria-expanded={open} aria-controls="top-menu" aria-label={label} onClick={() => setOpen((o) => !o)}>
        <span aria-hidden>☰</span>
      </button>
      <div id="top-menu" hidden={!open} className="panel absolute right-0 top-full z-40 mt-2 w-56 p-3">
        <div className="grid grid-cols-2 gap-2 [&>*]:min-h-11 [&>*]:justify-center">{children}</div>
      </div>
    </div>
  )
}
