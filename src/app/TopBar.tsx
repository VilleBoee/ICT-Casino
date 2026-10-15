import { CountUp } from '../components'
import { DAILY_REFILL } from '../engine'
import { href } from './router'
import { useWallet } from './wallet'
import { useSound } from './sound'
import { useT } from '../i18n'
import { settings, useSettings } from './settings'

export function TopBar() {
  const t = useT()
  const { lang } = useSettings()
  const { balance, canRefill, wallet } = useWallet()
  const { muted, toggleMute } = useSound()
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 sm:gap-4 sm:px-4 sm:py-3">
        <a href={href('/')} className="shrink-0 py-0 font-mono text-base font-extrabold pointer-coarse:py-2.5 text-fg no-underline hover:no-underline sm:text-lg">
          ICT<span className="text-neon text-glow">_</span>Casino
        </a>
        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-3">
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
            aria-pressed={!muted}
            aria-label={muted ? t('top.unmute') : t('top.mute')}
            onClick={toggleMute}
            data-sfx="none"
            title={muted ? t('top.soundOff') : t('top.soundOn')}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <div className="whitespace-nowrap rounded-md border border-neon/40 bg-surface px-2 py-1 shadow-glow-neon sm:px-3 sm:py-1.5" aria-live="polite">
            <span className="font-mono text-xs text-muted">$ </span>
            <CountUp value={balance} className="num text-lg font-semibold text-neon" />
            <span className="sr-only">{t('top.balance', { n: balance })}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
