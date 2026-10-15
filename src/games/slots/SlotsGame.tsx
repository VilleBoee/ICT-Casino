import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '../../i18n'
import { errorText } from '../../i18n/errors'
import { motion, useReducedMotion } from 'framer-motion'
import { CountUp, ResultToast, Table } from '../../components'
import { useWallet } from '../../app/wallet'
import { play } from '../../app/sound'
import {
  PAYLINES, REELS, SLOT_PAYTABLE, SLOT_SYMBOLS, rollSlots, slotsRtp, spinSlots, type SlotsOutcome,
} from '../../engine/slots'
import type { Chips, RoundResult } from '../../engine/types'
import { Reel } from './Reel'
import { GRID_H, SYMBOL_UI, buildStrip, linePoints, winningCells } from './symbols'

const LINE_BETS = [1, 2, 5, 10, 25, 50] as const
const AUTO = [10, 25, 50] as const
const BASE_S = 1.1
const STAGGER_S = 0.35
const LINE_COLORS = ['#39ff88', '#22d3ee', '#fbbf24', '#c084fc', '#f87171', '#4ade80', '#fb923c', '#60a5fa', '#f472b6', '#e6edf3']

export default function SlotsGame() {
  const { balance, wallet } = useWallet()
  const reduce = useReducedMotion()
  const t = useT()
  const [lineBet, setLineBet] = useState<Chips>(1)
  const [round, setRound] = useState<RoundResult<SlotsOutcome> | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [lastWin, setLastWin] = useState<Chips>(0)
  const [toast, setToast] = useState<RoundResult<SlotsOutcome> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [autoLeft, setAutoLeft] = useState(0)
  const [focusLine, setFocusLine] = useState<number | null>(null)
  const pending = useRef<RoundResult<SlotsOutcome> | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const idle = useMemo(() => rollSlots(1).outcome.grid, []) // decorative starting grid (not a bet)
  const stake = lineBet * PAYLINES.length

  useEffect(() => () => { if (pending.current) wallet.settle(pending.current) }, [wallet])

  const stop = useCallback(() => {
    const r = pending.current
    if (!r) return
    pending.current = null
    wallet.settle(r)
    setLastWin(r.payout)
    if (r.payout > 0) setToast(r)
    setSpinning(false)
  }, [wallet])

  const spin = useCallback(() => {
    if (pending.current) return
    let r: RoundResult<SlotsOutcome>
    try { r = spinSlots(wallet, lineBet) } catch (e) { setError(errorText(e, t)); setAutoLeft(0); return }
    setError(null); setToast(null); setLastWin(0); setFocusLine(null)
    pending.current = r
    setRound(r)
    setSpinning(true)
    if (reduce) queueMicrotask(stop)
  }, [wallet, lineBet, reduce, stop])

  // Auto-spin: next spin after a short pause; stops when the balance can't cover the stake.
  useEffect(() => {
    if (spinning || autoLeft <= 0) return
    if (balance < stake) { setAutoLeft(0); setError(t('sl.autoStopped')); return }
    const id = setTimeout(() => { setAutoLeft((n) => n - 1); spin() }, round ? (reduce ? 300 : 900) : 0)
    return () => clearTimeout(id)
  }, [spinning, autoLeft, balance, stake, spin, round, reduce])

  // Space / Enter on the page spins
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || (e.target as HTMLElement)?.closest('button,input,select,dialog,a')) return
      e.preventDefault()
      if (!spinning && autoLeft === 0) spin()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [spin, spinning, autoLeft])

  const grid = round?.outcome.grid ?? idle
  const wins = !spinning && round ? round.outcome.wins : []
  const cells = winningCells(focusLine === null ? wins : wins.filter((w) => w.line === focusLine))
  const strips = useMemo(
    () => grid.map((rows, reel) => (round && !reduce ? buildStrip(rows, 14 + reel * 5) : rows)),
    [grid, round, reduce],
  )

  return (
    <div className="space-y-4">
      <Table
        title="slots.tsx"
        subtitle={t('sl.subtitle', { rtp: (slotsRtp() * 100).toFixed(1) })}
        actions={<button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => dialog.current?.showModal()}>{t('sl.paytable')}</button>}
        footer={
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-muted">{t('sl.lineBetLc')}</span>
              <div className="flex flex-wrap gap-1" role="group" aria-label={t('sl.lineBet')}>
                {LINE_BETS.map((b) => (
                  <button key={b} type="button" aria-pressed={lineBet === b}
                    disabled={spinning || autoLeft > 0 || b * PAYLINES.length > balance}
                    className={`${lineBet === b ? 'btn-secondary' : 'btn-ghost'} px-3`} onClick={() => setLineBet(b)}>{b}</button>
                ))}
              </div>
              <span className="font-mono text-sm text-muted">{t('sl.xLines')} <span className="num text-neon">{stake}</span></span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn-primary min-w-32" disabled={spinning || autoLeft > 0 || balance < stake} onClick={spin}>
                {spinning ? t('rl.spinning') : t('rl.spin')} <kbd className="text-[10px] opacity-60">␣</kbd>
              </button>
              {autoLeft > 0 ? (
                <button type="button" className="btn-ghost" onClick={() => setAutoLeft(0)}>{t('sl.stopAuto', { n: autoLeft })}</button>
              ) : (
                AUTO.map((n) => (
                  <button key={n} type="button" className="btn-ghost px-3" disabled={spinning || balance < stake} onClick={() => setAutoLeft(n)}>{t('sl.auto', { n })}</button>
                ))
              )}
              {error && <span role="alert" className="ml-auto text-sm text-warn">{error}</span>}
            </div>
          </div>
        }
      >
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="relative aspect-[5/3] w-full">
            <div className="grid h-full gap-1.5" style={{ gridTemplateColumns: `repeat(${REELS}, minmax(0,1fr))` }}>
              {strips.map((strip, reel) => (
                <Reel
                  key={reel}
                  strip={strip}
                  spinKey={round?.roundId ?? 'idle'}
                  animate={!!round && spinning && !reduce}
                  durationS={BASE_S + reel * STAGGER_S}
                  highlight={(row) => cells.has(`${reel}:${row}`)}
                  dim={wins.length > 0}
                  onStop={reel === REELS - 1 && spinning ? stop : undefined}
                  onLand={spinning && !reduce ? () => play('reel', { rate: 1 + reel * 0.04 }) : undefined}
                />
              ))}
            </div>
            {/* winning paylines */}
            <svg viewBox={`0 0 500 ${GRID_H}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
              {wins.filter((w) => focusLine === null || w.line === focusLine).map((w, i) => (
                <motion.polyline key={`${round?.roundId}-${w.line}`} points={linePoints(w.line)} fill="none"
                  stroke={LINE_COLORS[w.line]} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
                  style={{ filter: `drop-shadow(0 0 4px ${LINE_COLORS[w.line]})` }}
                  initial={reduce ? false : { pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.85 }}
                  transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : i * 0.15 }} />
              ))}
            </svg>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3" aria-live="polite">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-muted">{t('sl.win')}</p>
              <CountUp value={lastWin} duration={reduce ? 0 : 1.2}
                className={`num text-4xl font-extrabold ${lastWin > 0 ? 'text-win text-glow' : 'text-muted'}`} />
              <span className="sr-only">{spinning ? t('sl.spinningSr') : t('sl.won', { n: lastWin })}</span>
            </div>
            {wins.length > 0 && (
              <ul className="flex flex-wrap gap-1" aria-label={t('sl.winningLines')}>
                {wins.map((w) => (
                  <li key={w.line}>
                    <button type="button" aria-pressed={focusLine === w.line}
                      onClick={() => setFocusLine((f) => (f === w.line ? null : w.line))}
                      className="rounded border px-2 py-1 font-mono text-xs" style={{ borderColor: LINE_COLORS[w.line], color: LINE_COLORS[w.line] }}>
                      L{w.line + 1} · {w.count}× {SYMBOL_UI[w.symbol].glyph} · +{w.payout}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Table>

      <dialog ref={dialog} className="m-auto w-[min(32rem,92vw)] rounded-lg border border-border bg-surface p-0 text-fg shadow-panel backdrop:bg-bg/80"
        aria-labelledby="paytable-title" onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 id="paytable-title">{t('sl.paytable')}</h2>
            <button type="button" className="btn-ghost px-2 py-1" onClick={() => dialog.current?.close()} aria-label={t('sl.closePaytable')}>✕</button>
          </div>
          <p className="text-sm text-muted">{t('sl.pays')}</p>
          <table className="w-full font-mono text-sm">
            <thead><tr className="text-left text-muted"><th className="py-1">{t('sl.symbol')}</th><th className="text-right">×3</th><th className="text-right">×4</th><th className="text-right">×5</th></tr></thead>
            <tbody>
              {[...SLOT_SYMBOLS].reverse().map((s) => (
                <tr key={s} className="border-t border-border">
                  <td className="py-1.5"><span style={{ color: SYMBOL_UI[s].color }} className="mr-2 text-lg">{SYMBOL_UI[s].glyph}</span>{t(`sl.s.${s}`)}</td>
                  {SLOT_PAYTABLE[s].map((p, i) => <td key={i} className="num text-right">{p}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <div>
            <p className="mb-2 font-mono text-xs text-muted">{t('sl.paylines')}</p>
            <div className="grid grid-cols-5 gap-2">
              {PAYLINES.map((_, l) => (
                <svg key={l} viewBox={`0 0 500 ${GRID_H}`} className="rounded border border-border bg-bg" aria-label={t('sl.line', { n: l + 1 })}>
                  <polyline points={linePoints(l)} fill="none" stroke={LINE_COLORS[l]} strokeWidth={24} strokeLinecap="round" />
                </svg>
              ))}
            </div>
          </div>
        </div>
      </dialog>
      <ResultToast result={toast} message={toast ? t(toast.outcome.wins.length === 1 ? 'sl.lines1' : 'sl.linesN', { n: toast.outcome.wins.length }) : undefined} onDismiss={() => setToast(null)} />
    </div>
  )
}
