import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { BetPanel, ResultToast, Table } from '../../components'
import { useWallet } from '../../app/wallet'
import { play } from '../../app/sound'
import { useT } from '../../i18n'
import { errorText } from '../../i18n/errors'
import { PLINKO_RISKS, PLINKO_ROWS, dropPlinko, plinkoMultipliers, plinkoRtp, type PlinkoOutcome, type PlinkoRisk, type PlinkoRows } from '../../engine'
import type { Chips, RoundResult } from '../../engine/types'
import { BALL_R, PEG_R, VIEW_W, ballKeyframes, board, fmtMult, pegXY, slotTone, slotX } from './geometry'

const HISTORY = 12
const QUICK_S = 0.35

export default function PlinkoGame() {
  const { balance, wallet } = useWallet()
  const reduce = useReducedMotion()
  const t = useT()
  const [bet, setBet] = useState<Chips>(10)
  const [lastBet, setLastBet] = useState<Chips>()
  const [rows, setRows] = useState<PlinkoRows>(12)
  const [risk, setRisk] = useState<PlinkoRisk>('medium')
  const [drop, setDrop] = useState<RoundResult<PlinkoOutcome> | null>(null)
  const [landed, setLanded] = useState<RoundResult<PlinkoOutcome> | null>(null)
  const [history, setHistory] = useState<RoundResult<PlinkoOutcome>[]>([])
  const [toast, setToast] = useState<RoundResult<PlinkoOutcome> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef<RoundResult<PlinkoOutcome> | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const dropping = drop !== null
  const b = board(rows)
  const mults = plinkoMultipliers(rows, risk)

  // never strand a debited bet: settle on unmount
  useEffect(() => () => { timers.current.forEach(clearTimeout); if (pending.current) wallet.settle(pending.current) }, [wallet])

  /** Ball landed: only now does the wallet get paid. */
  const land = useCallback(() => {
    const r = pending.current
    if (!r) return
    pending.current = null
    timers.current.forEach(clearTimeout); timers.current = []
    wallet.settle(r)
    play(r.outcome.multiplier >= 1 ? 'chip' : 'tick')
    setLanded(r)
    setDrop(null)
    setHistory((h) => [r, ...h].slice(0, HISTORY))
    setToast(r)
  }, [wallet])

  const start = () => {
    if (dropping) return
    let r: RoundResult<PlinkoOutcome>
    try { r = dropPlinko(wallet, { amount: bet, rows, risk }) } catch (e) { setError(errorText(e, t)); return }
    setError(null); setToast(null); setLanded(null); setLastBet(bet)
    pending.current = r
    setDrop(r)
    if (!reduce) {
      // a soft tick on every peg the ball touches (throttled in the sound service)
      const kf = ballKeyframes(r.outcome)
      timers.current = kf.pegHits.map((at) => setTimeout(() => play('tick', { volume: 0.35, rate: 1.4 }), at * kf.duration * 1000))
    }
  }

  const kf = drop ? ballKeyframes(drop.outcome) : null
  const hitSlot = landed && landed.outcome.rows === rows && landed.outcome.risk === risk ? landed.outcome.slot : null
  const pick = 'min-h-11 min-w-11 px-3'

  return (
    <div className="space-y-4">
      <Table
        title="plinko.tsx"
        subtitle={t('pl.subtitle', { rows, rtp: (plinkoRtp(rows, risk) * 100).toFixed(1) })}
        actions={
          <div className="flex max-w-[55vw] gap-1 overflow-x-auto" aria-label={t('pl.recent')}>
            {history.length === 0 && <span className="font-mono text-xs text-muted">{t('pl.noDrops')}</span>}
            {history.map((h) => (
              <span key={h.roundId} className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${slotTone(h.outcome.multiplier)}`}>{fmtMult(h.outcome.multiplier)}</span>
            ))}
          </div>
        }
        footer={
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-4">
              <fieldset className="space-y-1">
                <legend className="font-mono text-xs uppercase text-muted">{t('pl.rows')}</legend>
                <div className="flex gap-1" role="group">
                  {PLINKO_ROWS.map((n) => (
                    <button key={n} type="button" aria-pressed={rows === n} disabled={dropping}
                      className={`${rows === n ? 'btn-secondary' : 'btn-ghost'} ${pick}`} onClick={() => { setRows(n); setLanded(null) }}>{n}</button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="space-y-1">
                <legend className="font-mono text-xs uppercase text-muted">{t('pl.risk')}</legend>
                <div className="flex gap-1" role="group">
                  {PLINKO_RISKS.map((k) => (
                    <button key={k} type="button" aria-pressed={risk === k} disabled={dropping}
                      className={`${risk === k ? 'btn-secondary' : 'btn-ghost'} ${pick}`} onClick={() => { setRisk(k); setLanded(null) }}>{t(`pl.risk.${k}`)}</button>
                  ))}
                </div>
              </fieldset>
              <button type="button" className="btn-primary ml-auto min-h-11 min-w-32" disabled={dropping || bet <= 0 || bet > balance} onClick={start} data-sfx="chip">
                {dropping ? t('pl.dropping') : t('pl.drop', { n: bet })}
              </button>
            </div>
            <BetPanel balance={balance} bet={bet} onBetChange={setBet} lastBet={lastBet} disabled={dropping} />
            {error && <p role="alert" className="text-sm text-warn">{error}</p>}
          </div>
        }
      >
        <div className="mx-auto w-full max-w-xl">
          <svg viewBox={`0 0 ${VIEW_W} ${b.height}`} className="h-auto w-full" role="img"
            aria-label={hitSlot !== null ? t('pl.boardResult', { m: fmtMult(mults[hitSlot]) }) : t('pl.board', { rows })}>
            {Array.from({ length: rows }, (_, i) => Array.from({ length: i + 3 }, (_, j) => {
              const p = pegXY(b, i, j)
              return <circle key={`${i}-${j}`} cx={p.x} cy={p.y} r={PEG_R} className="fill-fg/70" />
            }))}
            {drop && kf && (
              <motion.circle
                key={drop.roundId}
                r={BALL_R}
                className="fill-neon"
                style={{ filter: 'drop-shadow(0 0 4px var(--color-neon))' }}
                initial={{ cx: reduce ? slotX(b, drop.outcome.slot) : kf.x[0], cy: reduce ? 0 : kf.y[0] }}
                animate={reduce ? { cy: b.slotY + b.slotH / 2 } : { cx: kf.x, cy: kf.y }}
                transition={reduce ? { duration: QUICK_S, ease: 'easeIn' } : { duration: kf.duration, times: kf.times, ease: 'easeInOut' }}
                onAnimationComplete={land}
              />
            )}
          </svg>
          {/* multiplier slots, coloured by value; the one the ball landed in pulses */}
          <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${rows + 1}, minmax(0, 1fr))`, marginInline: `${(b.dx / VIEW_W) * 50}%` }}>
            {mults.map((m, k) => (
              <motion.div key={`${rows}-${risk}-${k}`} data-slot={k}
                animate={hitSlot === k && !reduce ? { scale: [1, 1.25, 1], y: [0, 4, 0] } : { scale: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className={`grid min-h-7 place-items-center rounded-sm font-mono text-[9px] font-bold leading-none sm:text-[11px] ${slotTone(m)} ${hitSlot === k ? 'ring-2 ring-fg' : ''}`}>
                {m}
              </motion.div>
            ))}
          </div>
          <p className="mt-3 text-center font-mono text-sm text-muted" aria-live="polite">
            {landed ? t('pl.landed', { m: fmtMult(landed.outcome.multiplier), n: landed.payout }) : dropping ? t('pl.dropping') : t('pl.hint')}
          </p>
        </div>
      </Table>
      <ResultToast result={toast} message={toast ? fmtMult(toast.outcome.multiplier) : undefined} onDismiss={() => setToast(null)} />
    </div>
  )
}
