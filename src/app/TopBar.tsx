import { useState } from 'react'
import { CountUp } from '../components'
import { DAILY_REFILL } from '../engine'
import { href } from './router'
import { useWallet } from './wallet'

export function TopBar() {
  const { balance, canRefill, wallet } = useWallet()
  const [muted, setMuted] = useState(true)
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <a href={href('/')} className="font-mono text-lg font-extrabold text-fg no-underline hover:no-underline">
          ICT<span className="text-neon text-glow">_</span>Casino
        </a>
        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            className="btn-ghost px-3"
            disabled={!canRefill}
            onClick={() => wallet.refill()}
            title={canRefill ? `Claim ${DAILY_REFILL} free chips` : 'Daily refill already claimed'}
          >
            {canRefill ? `+${DAILY_REFILL} daily` : 'refill ✓'}
          </button>
          <button
            type="button"
            className="btn-ghost px-3"
            aria-pressed={!muted}
            aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <div className="rounded-md border border-neon/40 bg-surface px-3 py-1.5 shadow-glow-neon" aria-live="polite">
            <span className="font-mono text-xs text-muted">$ </span>
            <CountUp value={balance} className="num text-lg font-semibold text-neon" />
            <span className="sr-only">Balance: {balance} chips</span>
          </div>
        </div>
      </div>
    </header>
  )
}
