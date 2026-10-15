import { useState } from 'react'
import type { Chips } from '../../engine/types'
import { useT } from '../../i18n'

export interface BuyInProps {
  balance: Chips
  bigBlind: Chips
  onSit: (buyIn: Chips, bots: number, risingBlinds: boolean) => void
  error?: string | null
  lastSession?: { hands: number; net: Chips } | null
}

export function BuyIn({ balance, bigBlind, onSit, error, lastSession }: BuyInProps) {
  const min = bigBlind * 10
  const t = useT()
  const max = Math.min(balance, bigBlind * 100)
  const [buyIn, setBuyIn] = useState(() => Math.max(min, Math.min(max, bigBlind * 50)))
  const [bots, setBots] = useState(5)
  const [rising, setRising] = useState(false)
  const can = balance >= min
  const value = Math.max(min, Math.min(max, buyIn))
  return (
    <div className="panel mx-auto max-w-lg space-y-5">
      <div>
        <h2>{t('he.seat')}</h2>
        <p className="text-sm text-muted">{t('he.intro', { sb: bigBlind / 2, bb: bigBlind, a: min, b: bigBlind * 100 })}</p>
      </div>
      {lastSession && (
        <p className="font-mono text-sm" role="status">
          {t('he.lastSession', { n: lastSession.hands })}{' '}
          <span className={lastSession.net >= 0 ? 'text-win' : 'text-lose'}>{lastSession.net >= 0 ? '+' : ''}{lastSession.net}</span>
        </p>
      )}
      {can ? (
        <>
          <label className="block space-y-2">
            <span className="flex justify-between font-mono text-sm"><span className="text-muted">{t('he.buyIn')}</span><span className="num text-neon">{value}</span></span>
            <input type="range" min={min} max={max} step={bigBlind} value={value} onChange={(e) => setBuyIn(Number(e.target.value))}
              className="w-full accent-neon pointer-coarse:h-11" aria-valuetext={t('he.chips', { n: value })} />
          </label>
          <fieldset className="space-y-2">
            <legend className="font-mono text-sm text-muted">{t('he.opponents')}</legend>
            <div className="flex gap-2">
              {[5, 6, 7, 8].map((n) => (
                <button key={n} type="button" aria-pressed={bots === n} onClick={() => setBots(n)}
                  className={bots === n ? 'btn-secondary' : 'btn-ghost'}>{t('he.nBots', { n })}</button>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={rising} onChange={(e) => setRising(e.target.checked)} className="accent-neon" />
            {t('he.rising')} <span className="text-muted">{t('he.risingHelp')}</span>
          </label>
          <button type="button" className="btn-primary w-full" onClick={() => onSit(value, bots, rising)}>{t('he.sit', { n: value })}</button>
        </>
      ) : (
        <p className="text-warn">{t('he.needChips', { n: min })}</p>
      )}
      {error && <p role="alert" className="text-sm text-lose">{error}</p>}
    </div>
  )
}
