import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { BetPanel, ResultToast, Table } from '../../components'
import { useWallet } from '../../app/wallet'
import { CrashRound, timeForMultiplier, type CrashOutcome, type CrashStatus } from '../../engine/crash'
import type { Chips, RoundResult } from '../../engine/types'
import { VIEW_H, VIEW_W, curvePoints, fmtX, parseAuto, scales, toXY, yTicks } from './graph'

const HISTORY = 16
const pointColor = (m: number) => (m < 1.5 ? 'text-lose border-lose/60' : m < 3 ? 'text-warn border-warn/60' : m < 10 ? 'text-cyan border-cyan/60' : 'text-neon border-neon/60')

type View = { t: number; m: number; status: CrashStatus; ended: boolean }

export default function CrashGame() {
  const { balance, wallet } = useWallet()
  const reduce = useReducedMotion()
  const [bet, setBet] = useState<Chips>(10)
  const [lastBet, setLastBet] = useState<Chips>()
  const [autoStr, setAutoStr] = useState('')
  const [view, setView] = useState<View | null>(null)
  const [history, setHistory] = useState<number[]>([])
  const [toast, setToast] = useState<RoundResult<CrashOutcome> | null>(null)
  const [result, setResult] = useState<RoundResult<CrashOutcome> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const round = useRef<CrashRound | null>(null)
  const start = useRef(0)
  const raf = useRef(0)
  const settled = useRef(false)
  const auto = parseAuto(autoStr)
  const live = !!view && !view.ended

  const settle = useCallback(() => {
    const r = round.current
    if (!r || settled.current || !r.finished) return
    settled.current = true
    const res = r.result()
    wallet.settle(res)
    setResult(res)
    setToast(res)
  }, [wallet])

  // Leaving mid-round: the player didn't cash out, so the round plays to its crash.
  useEffect(() => () => {
    cancelAnimationFrame(raf.current)
    const r = round.current
    if (r && !settled.current) { r.finish(); wallet.settle(r.result()) }
  }, [wallet])

  const frame = useCallback((now: number) => {
    const r = round.current
    if (!r) return
    const t = now - start.current
    const { multiplier, status } = r.tick(t)
    if (status !== 'running') settle() // cashed (manual/auto) or crashed: settle right away
    // keep the line running after a cash-out until the actual crash, so the player sees where it went
    const ended = t >= r.crashTimeMs
    setView({ t: Math.min(t, r.crashTimeMs), m: multiplier, status, ended })
    if (ended) {
      setHistory((h) => [r.result().outcome.crashPoint, ...h].slice(0, HISTORY))
      return
    }
    raf.current = requestAnimationFrame(frame)
  }, [settle])

  const launch = () => {
    if (live) return
    let r: CrashRound
    try { r = new CrashRound(wallet, bet, auto ? { autoCashOut: auto } : {}) } catch (e) { setError((e as Error).message); return }
    setError(null); setToast(null); setResult(null); setLastBet(bet)
    round.current = r
    settled.current = false
    start.current = performance.now()
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(frame)
  }

  const cashOut = useCallback(() => {
    const r = round.current
    if (!r || r.status !== 'running') return
    r.cashOut(performance.now() - start.current)
    settle()
  }, [settle])

  // Space: cash out while running, otherwise launch
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || (e.target as HTMLElement)?.closest('input,button,select,a')) return
      e.preventDefault()
      if (round.current?.status === 'running' && live) cashOut()
      else if (!live) document.getElementById('crash-launch')?.click()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cashOut, live])

  const r = round.current
  const status = view?.status
  const crashedOut = !!view?.ended
  const canCash = live && status === 'running'
  const m = view?.m ?? 1
  const cashedAt = r?.cashedAt ?? null
  const s = view ? scales(view.t, m) : scales(0, 1)
  const tip = view ? toXY(view.t, m, s) : toXY(0, 1, s)
  const readoutColor = crashedOut ? (cashedAt ? 'text-win' : 'text-lose') : status === 'cashed' ? 'text-win' : 'text-neon'

  return (
    <div className="space-y-4">
      <Table
        title="crash.tsx"
        subtitle="1% house edge · provably fair seed"
        actions={
          <div className="flex max-w-[60vw] gap-1 overflow-x-auto" aria-label="Recent crash points">
            {history.length === 0 && <span className="font-mono text-xs text-muted">no rounds yet</span>}
            {history.map((p, i) => (
              <span key={i} className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[11px] ${pointColor(p)}`}>{fmtX(p)}</span>
            ))}
          </div>
        }
        footer={
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <BetPanel balance={balance} bet={bet} onBetChange={setBet} lastBet={lastBet} disabled={live} />
            <div className="flex flex-col justify-between gap-3 md:w-64">
              <label className="space-y-1">
                <span className="font-mono text-xs uppercase tracking-wider text-muted">auto cash-out</span>
                <input inputMode="decimal" placeholder="off (e.g. 2.00)" value={autoStr} disabled={live}
                  onChange={(e) => setAutoStr(e.target.value)}
                  aria-invalid={!!autoStr && !auto}
                  className="num w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-fg placeholder:text-muted/70 aria-[invalid=true]:border-lose" />
                {autoStr && !auto && <span className="text-xs text-lose">min 1.01x</span>}
              </label>
              {canCash ? (
                <button type="button" onClick={cashOut} className="btn-primary h-16 w-full text-lg">
                  CASH OUT <span className="num">{Math.floor(bet * m)}</span> <kbd className="text-[10px] opacity-60">␣</kbd>
                </button>
              ) : (
                <button id="crash-launch" type="button" onClick={launch} disabled={live || bet <= 0 || bet > balance}
                  className="btn-secondary h-16 w-full text-lg">
                  {live ? (status === 'cashed' ? 'cashed — waiting…' : '…') : `LAUNCH ${bet}`}
                </button>
              )}
              {error && <p role="alert" className="text-sm text-warn">{error}</p>}
            </div>
          </div>
        }
      >
        <div className="relative aspect-[2/1] w-full overflow-hidden rounded-md border border-border bg-bg/80 font-mono">
          {!reduce && (
            <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
              {yTicks(s.yMax).map((v) => {
                const y = toXY(0, v, s).y
                return (
                  <g key={v}>
                    <line x1={0} x2={VIEW_W} y1={y} y2={y} stroke="#24303a" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
                    <text x={6} y={y - 3} fill="#93a1ad" fontSize={11}>{fmtX(v)}</text>
                  </g>
                )
              })}
              {view && (
                <>
                  <polyline points={`${curvePoints(view.t, crashedOut ? m : Infinity)} ${tip.x},${VIEW_H} 0,${VIEW_H}`}
                    fill={crashedOut && !cashedAt ? 'rgb(248 113 113 / .08)' : 'rgb(57 255 136 / .08)'} stroke="none" />
                  <polyline points={curvePoints(view.t, crashedOut ? m : Infinity)} fill="none"
                    stroke={crashedOut ? '#f87171' : '#39ff88'} strokeWidth={3} vectorEffect="non-scaling-stroke"
                    style={{ filter: `drop-shadow(0 0 6px ${crashedOut ? '#f87171' : '#39ff88'})` }} />
                  {cashedAt && (() => {
                    const c = toXY(timeForMultiplier(cashedAt), cashedAt, s)
                    return <circle cx={c.x} cy={c.y} r={5} fill="#4ade80" vectorEffect="non-scaling-stroke" />
                  })()}
                  {crashedOut ? (
                    <motion.circle cx={tip.x} cy={tip.y} fill="#f87171" initial={{ r: 4, opacity: 1 }} animate={{ r: 60, opacity: 0 }} transition={{ duration: 0.6 }} />
                  ) : (
                    <circle cx={tip.x} cy={tip.y} r={5} fill="#39ff88" />
                  )}
                </>
              )}
            </svg>
          )}
          <div className="absolute inset-0 grid place-items-center text-center" aria-live="polite" aria-atomic>
            <div>
              {crashedOut && <p className="text-sm font-bold uppercase tracking-widest text-lose">crashed @ {fmtX(m)}</p>}
              <motion.p
                key={crashedOut ? 'boom' : 'run'}
                initial={crashedOut && !reduce ? { scale: 1.4 } : false}
                animate={{ scale: 1 }}
                className={`num text-5xl font-extrabold sm:text-7xl ${readoutColor} ${crashedOut ? '' : 'text-glow'}`}
                aria-label={view ? `multiplier ${fmtX(m)}` : 'ready'}
              >
                {view ? fmtX(m) : '1.00x'}
              </motion.p>
              {cashedAt !== null && <p className="mt-1 text-sm text-win">cashed out @ {fmtX(cashedAt)}{result?.outcome.auto ? ' (auto)' : ''} · +{Math.floor(bet * cashedAt) - bet}</p>}
              {!view && <p className="mt-1 text-sm text-muted">$ ./launch --bet {bet}{auto ? ` --auto ${fmtX(auto)}` : ''}</p>}
              {crashedOut && result && <p className="mt-1 text-[10px] text-muted">seed {result.outcome.seed}</p>}
            </div>
          </div>
        </div>
      </Table>
      <ResultToast result={toast} message={toast ? (toast.outcome.cashedAt ? `cashed @ ${fmtX(toast.outcome.cashedAt)}` : `crashed @ ${fmtX(toast.outcome.crashPoint)}`) : undefined} onDismiss={() => setToast(null)} />
    </div>
  )
}
