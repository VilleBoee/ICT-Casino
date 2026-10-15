import { useCallback, useEffect, useRef, useState } from 'react'
import { animate, motion, useReducedMotion } from 'framer-motion'
import { BetPanel, ResultToast, Table } from '../../components'
import { useWallet } from '../../app/wallet'
import { play, stop as stopSfx } from '../../app/sound'
import { rollDice, type DiceDirection, type DiceOutcome } from '../../engine/dice'
import type { Chips, RoundResult } from '../../engine/types'
import { clampTarget, mirrorTarget, preview, targetRange } from './odds'

const ROLL_S = 0.9
const HISTORY = 20
const fmt = (n: number) => n.toFixed(2)

export default function DiceGame() {
  const { balance, wallet } = useWallet()
  const reduce = useReducedMotion()
  const [bet, setBet] = useState<Chips>(10)
  const [lastBet, setLastBet] = useState<Chips>()
  const [direction, setDirection] = useState<DiceDirection>('under')
  const [target, setTarget] = useState(50)
  const [rolling, setRolling] = useState(false)
  const [shown, setShown] = useState<number | null>(null)
  const [last, setLast] = useState<RoundResult<DiceOutcome> | null>(null)
  const [history, setHistory] = useState<RoundResult<DiceOutcome>[]>([])
  const [toast, setToast] = useState<RoundResult<DiceOutcome> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef<RoundResult<DiceOutcome> | null>(null)
  const anim = useRef<{ stop: () => void } | null>(null)
  const p = preview(bet, target, direction)
  const { min, max } = targetRange(direction)

  useEffect(() => () => { anim.current?.stop(); if (pending.current) wallet.settle(pending.current) }, [wallet])

  const settle = useCallback(() => {
    const r = pending.current
    if (!r) return
    pending.current = null
    stopSfx('spin')
    play('ball')
    wallet.settle(r)
    setShown(r.outcome.roll)
    setLast(r)
    setHistory((h) => [r, ...h].slice(0, HISTORY))
    setToast(r)
    setRolling(false)
  }, [wallet])

  const roll = useCallback(() => {
    if (pending.current) return
    let r: RoundResult<DiceOutcome>
    try { r = rollDice(wallet, { amount: bet, target, direction }) } catch (e) { setError((e as Error).message); return }
    setError(null); setToast(null); setLastBet(bet); setLast(null)
    pending.current = r
    play('spin', { rate: 2.4 })
    if (reduce) { settle(); return }
    setRolling(true)
    // ticker: scramble, then ease into the engine's roll
    const from = shown ?? 50
    anim.current = animate(0, 1, {
      duration: ROLL_S, ease: [0.2, 0.7, 0.2, 1],
      onUpdate: (k) => setShown(k < 0.55 ? Math.floor(Math.random() * 10000) / 100 : from + (r.outcome.roll - from) * ((k - 0.55) / 0.45)),
      onComplete: settle,
    })
  }, [wallet, bet, target, direction, reduce, settle, shown])

  // Space rolls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || (e.target as HTMLElement)?.closest('input,button,select,a')) return
      e.preventDefault()
      if (!rolling && bet <= balance) roll()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [roll, rolling, bet, balance])

  const flip = (d: DiceDirection) => { if (d !== direction) { setTarget((t) => mirrorTarget(t, d)); setDirection(d) } }
  const won = !rolling && last ? last.outcome.won : null
  const numColor = rolling ? 'text-fg' : won === null ? 'text-muted' : won ? 'text-win' : 'text-lose'
  const winZone = direction === 'under' ? { left: 0, width: target } : { left: target, width: 100 - target }

  return (
    <div className="space-y-4">
      <Table
        title="dice.tsx"
        subtitle="roll 0.00–99.99 · 1% house edge"
        footer={
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <BetPanel balance={balance} bet={bet} onBetChange={setBet} lastBet={lastBet} disabled={rolling} />
            <div className="flex flex-col justify-end gap-3 md:w-56">
              <button type="button" className="btn-primary h-16 text-lg" disabled={rolling || bet <= 0 || bet > balance} onClick={roll}>
                {rolling ? 'Rolling…' : 'ROLL'} <kbd className="text-[10px] opacity-60">␣</kbd>
              </button>
              {error && <p role="alert" className="text-sm text-warn">{error}</p>}
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* readout */}
          <div className="text-center" aria-live="polite" aria-atomic>
            <p className={`num text-6xl font-extrabold transition-colors sm:text-8xl ${numColor} ${won ? 'text-glow' : ''}`}>
              {shown === null ? '--.--' : fmt(shown)}
            </p>
            <p className="h-6 font-mono text-sm">
              {!rolling && last && (last.outcome.won
                ? <span className="text-win">WIN · {direction} {fmt(last.outcome.target)} · +{last.payout - last.stake}</span>
                : <span className="text-lose">LOSE · needed {last.outcome.direction} {fmt(last.outcome.target)} · −{last.stake}</span>)}
            </p>
          </div>

          {/* bar + slider */}
          <div className="relative px-1 pt-8">
            <div className="relative h-3 overflow-hidden rounded-full bg-lose/60" aria-hidden>
              <div className="absolute inset-y-0 bg-win/80" style={{ left: `${winZone.left}%`, width: `${winZone.width}%` }} />
            </div>
            {shown !== null && (
              <motion.div className="pointer-events-none absolute top-0 -translate-x-1/2" initial={false}
                animate={{ left: `${shown}%` }} transition={{ duration: 0 }} aria-hidden>
                <span className={`block rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs font-bold ring-1 ${rolling ? 'text-fg ring-border' : won ? 'text-win ring-win' : 'text-lose ring-lose'}`}>{fmt(shown)}</span>
                <span className="mx-auto block h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-current text-border" />
              </motion.div>
            )}
            <input type="range" min={0} max={100} step={0.01} value={target} disabled={rolling}
              onChange={(e) => setTarget(clampTarget(Number(e.target.value), direction))}
              aria-label={`Target: roll ${direction}`} aria-valuetext={`${direction} ${fmt(target)}, ${p.chance}% chance`}
              className="absolute inset-x-0 bottom-[-6px] h-6 w-full pointer-coarse:bottom-[-16px] pointer-coarse:h-11 cursor-pointer appearance-none bg-transparent accent-neon disabled:cursor-not-allowed" />
            <div className="mt-3 flex justify-between font-mono text-[10px] text-muted"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
          </div>

          {/* controls + live preview */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="panel space-y-2 p-3">
              <p className="font-mono text-xs uppercase text-muted">direction</p>
              <div className="flex gap-1" role="group" aria-label="Direction">
                {(['under', 'over'] as const).map((d) => (
                  <button key={d} type="button" aria-pressed={direction === d} disabled={rolling}
                    className={`${direction === d ? 'btn-secondary' : 'btn-ghost'} flex-1 px-2`} onClick={() => flip(d)}>{d}</button>
                ))}
              </div>
            </div>
            <label className="panel space-y-2 p-3">
              <span className="block font-mono text-xs uppercase text-muted">target ({fmt(min)}–{fmt(max)})</span>
              <input type="number" step={0.01} min={min} max={max} value={target} disabled={rolling}
                onChange={(e) => setTarget(clampTarget(Number(e.target.value), direction))}
                className="num w-full rounded-md border border-border bg-surface-2 px-2 py-1.5 text-lg text-fg" />
            </label>
            <div className="panel space-y-1 p-3">
              <p className="font-mono text-xs uppercase text-muted">win chance</p>
              <p className="num text-2xl text-cyan">{p.chance.toFixed(2)}%</p>
            </div>
            <div className="panel space-y-1 p-3">
              <p className="font-mono text-xs uppercase text-muted">multiplier · payout</p>
              <p className="num text-2xl text-neon">{p.multiplier.toFixed(4)}x</p>
              <p className="num text-xs text-muted">pays {p.payout} (+{p.profit})</p>
            </div>
          </div>

          {/* history */}
          <section aria-label="Recent rolls" className="space-y-1">
            <h3 className="text-xs text-muted">recent rolls</h3>
            <ol className="flex flex-wrap gap-1">
              {history.length === 0 && <li className="font-mono text-xs text-muted">none yet</li>}
              {history.map((h) => (
                <li key={h.roundId} title={`${h.outcome.direction} ${fmt(h.outcome.target)} · ${h.outcome.chance}%`}
                  className={`rounded border px-1.5 py-0.5 font-mono text-[11px] ${h.outcome.won ? 'border-win/60 text-win' : 'border-lose/60 text-lose'}`}>
                  {fmt(h.outcome.roll)} <span className="opacity-60">{h.outcome.direction === 'under' ? '<' : '>'}{fmt(h.outcome.target)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </Table>
      <ResultToast result={toast} message={toast ? `rolled ${fmt(toast.outcome.roll)}` : undefined} onDismiss={() => setToast(null)} />
    </div>
  )
}
