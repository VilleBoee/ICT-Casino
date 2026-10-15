import { CountUp } from '../components'
import { DAILY_REFILL } from '../engine'
import { href } from './router'
import { useWallet } from './wallet'
import { useSound } from './sound'

export function TopBar() {
  const { balance, canRefill, wallet } = useWallet()
  const { muted, toggleMute } = useSound()
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 sm:gap-4 sm:px-4 sm:py-3">
        <a href={href('/')} className="shrink-0 py-0 font-mono text-base font-extrabold pointer-coarse:py-2.5 text-fg no-underline hover:no-underline sm:text-lg">
          ICT<span className="text-neon text-glow">_</span>Casino
        </a>
        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-3">
          <button
            type="button"
            className="btn-ghost whitespace-nowrap px-2 sm:px-3"
            disabled={!canRefill}
            aria-label={canRefill ? `Claim ${DAILY_REFILL} free daily chips` : 'Daily refill already claimed'}
            onClick={() => wallet.refill()}
            title={canRefill ? `Claim ${DAILY_REFILL} free chips` : 'Daily refill already claimed'}
          >
            {canRefill ? <>+{DAILY_REFILL}<span className="hidden sm:inline"> daily</span></> : <><span className="hidden sm:inline">refill </span>✓</>}
          </button>
          <button
            type="button"
            className="btn-ghost px-2 sm:px-3"
            aria-pressed={!muted}
            aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
            onClick={toggleMute}
            data-sfx="none"
            title={muted ? 'Sound off (saved)' : 'Sound on (saved)'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <div className="whitespace-nowrap rounded-md border border-neon/40 bg-surface px-2 py-1 shadow-glow-neon sm:px-3 sm:py-1.5" aria-live="polite">
            <span className="font-mono text-xs text-muted">$ </span>
            <CountUp value={balance} className="num text-lg font-semibold text-neon" />
            <span className="sr-only">Balance: {balance} chips</span>
          </div>
        </div>
      </div>
    </header>
  )
}
