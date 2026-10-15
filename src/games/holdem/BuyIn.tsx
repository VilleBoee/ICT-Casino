import { useState } from 'react'
import type { Chips } from '../../engine/types'

export interface BuyInProps {
  balance: Chips
  bigBlind: Chips
  onSit: (buyIn: Chips, bots: number, risingBlinds: boolean) => void
  error?: string | null
  lastSession?: { hands: number; net: Chips } | null
}

export function BuyIn({ balance, bigBlind, onSit, error, lastSession }: BuyInProps) {
  const min = bigBlind * 10
  const max = Math.min(balance, bigBlind * 100)
  const [buyIn, setBuyIn] = useState(() => Math.max(min, Math.min(max, bigBlind * 50)))
  const [bots, setBots] = useState(5)
  const [rising, setRising] = useState(false)
  const can = balance >= min
  const value = Math.max(min, Math.min(max, buyIn))
  return (
    <div className="panel mx-auto max-w-lg space-y-5">
      <div>
        <h2>Take a seat</h2>
        <p className="text-sm text-muted">No-limit Hold'em · blinds {bigBlind / 2}/{bigBlind} · buy-in {min}–{bigBlind * 100}</p>
      </div>
      {lastSession && (
        <p className="font-mono text-sm" role="status">
          Last session: {lastSession.hands} hands,{' '}
          <span className={lastSession.net >= 0 ? 'text-win' : 'text-lose'}>{lastSession.net >= 0 ? '+' : ''}{lastSession.net}</span>
        </p>
      )}
      {can ? (
        <>
          <label className="block space-y-2">
            <span className="flex justify-between font-mono text-sm"><span className="text-muted">Buy-in</span><span className="num text-neon">{value}</span></span>
            <input type="range" min={min} max={max} step={bigBlind} value={value} onChange={(e) => setBuyIn(Number(e.target.value))}
              className="w-full accent-[#39ff88] pointer-coarse:h-11" aria-valuetext={`${value} chips`} />
          </label>
          <fieldset className="space-y-2">
            <legend className="font-mono text-sm text-muted">Opponents</legend>
            <div className="flex gap-2">
              {[5, 6, 7, 8].map((n) => (
                <button key={n} type="button" aria-pressed={bots === n} onClick={() => setBots(n)}
                  className={bots === n ? 'btn-secondary' : 'btn-ghost'}>{n} bots</button>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={rising} onChange={(e) => setRising(e.target.checked)} className="accent-[#39ff88]" />
            Rising blinds <span className="text-muted">(×1.5 every 10 hands)</span>
          </label>
          <button type="button" className="btn-primary w-full" onClick={() => onSit(value, bots, rising)}>Sit down with {value}</button>
        </>
      ) : (
        <p className="text-warn">You need at least {min} chips to sit down. Claim the daily refill in the top bar.</p>
      )}
      {error && <p role="alert" className="text-sm text-lose">{error}</p>}
    </div>
  )
}
