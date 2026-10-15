import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Chip, DENOMINATIONS, ResultToast, Table, type Denomination } from '../../components'
import { colorOf, spin, type RouletteOutcome } from '../../engine/roulette'
import type { RoundResult } from '../../engine/types'
import { useWallet } from '../../app/wallet'
import { play, stop as stopSfx } from '../../app/sound'
import { BettingBoard } from './BettingBoard'
import { Wheel } from './Wheel'
import { spotKey, toEngineBets, totalOf, type BetMap, type Spot } from './bets'
import { targetRotation } from './wheelMath'

const SPIN_S = 5.5
const HISTORY = 14
const DOT = { red: 'bg-[#b91c3a]', black: 'bg-surface-2 border border-border', green: 'bg-[#0f8a4a]' } as const

export default function RouletteGame() {
  const { balance, wallet } = useWallet()
  const reduce = useReducedMotion()
  const [chip, setChip] = useState<Denomination>(5)
  const [bets, setBets] = useState<BetMap>({})
  const [lastBets, setLastBets] = useState<BetMap>({})
  const [rotation, setRotation] = useState(0)
  const [ball, setBall] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [shown, setShown] = useState<number | null>(null)
  const [history, setHistory] = useState<number[]>([])
  const [toast, setToast] = useState<RoundResult<RouletteOutcome> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef<RoundResult<RouletteOutcome> | null>(null)

  const total = totalOf(bets)

  // Leaving mid-spin must not lose the payout: settle on unmount.
  useEffect(() => () => {
    if (pending.current) { wallet.settle(pending.current); pending.current = null }
  }, [wallet])

  const place = (s: Spot) => {
    if (spinning) return
    if (total + chip > balance) { setError('Not enough chips for that bet'); return }
    setError(null)
    const k = spotKey(s)
    setBets((b) => ({ ...b, [k]: { spot: s, amount: (b[k]?.amount ?? 0) + chip } }))
  }

  /** Called exactly once when the ball lands (or immediately under reduced motion). */
  const land = useCallback(() => {
    const r = pending.current
    if (!r) return
    pending.current = null
    stopSfx('spin')
    play('ball')
    wallet.settle(r)
    setShown(r.outcome.number)
    setHistory((h) => [r.outcome.number, ...h].slice(0, HISTORY))
    setToast(r)
    setSpinning(false)
  }, [wallet])

  const doSpin = () => {
    if (spinning || total === 0) return
    let r: RoundResult<RouletteOutcome>
    try { r = spin(wallet, toEngineBets(bets)) } catch (e) { setError((e as Error).message); return }
    setError(null)
    pending.current = r
    play('spin')
    setLastBets(bets)
    setShown(null)
    setToast(null)
    setRotation((rot) => targetRotation(rot, r.outcome.number))
    // ball orbits counter-clockwise and stops at the pointer (screen angle 0)
    setBall((b) => b - (8 * 360 + (((b % 360) + 360) % 360)))
    setSpinning(true)
    if (reduce) queueMicrotask(land)
  }

  const rebet = () => {
    if (totalOf(lastBets) <= balance) { setBets(lastBets); setError(null) } else setError('Not enough chips to rebet')
  }
  const lastColor = shown === null ? null : colorOf(shown)

  return (
    <div className="space-y-4">
      <Table
        title="roulette.tsx"
        subtitle="European · single zero · 35:1"
        actions={
          <div className="flex items-center gap-1" aria-label="Recent numbers">
            {history.length === 0 && <span className="font-mono text-xs text-muted">no spins yet</span>}
            {history.map((n, i) => (
              <span key={i} className={`grid h-6 w-6 place-items-center rounded font-mono text-[11px] font-bold ${DOT[colorOf(n)]} ${i === 0 ? 'ring-1 ring-neon' : 'opacity-80'}`}>{n}</span>
            ))}
          </div>
        }
        footer={
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Chip value">
              {DENOMINATIONS.map((d) => (
                <Chip key={d} value={d} size={44} selected={chip === d} disabled={spinning || d > balance - total} onClick={() => setChip(d)} />
              ))}
              <div className="ml-auto flex flex-wrap gap-2">
                <button type="button" className="btn-ghost" disabled={spinning || total === 0} onClick={() => setBets({})}>Clear</button>
                <button type="button" className="btn-ghost" disabled={spinning || totalOf(lastBets) === 0} onClick={rebet}>Rebet</button>
                <button type="button" className="btn-primary min-w-28" disabled={spinning || total === 0} onClick={doSpin}>
                  {spinning ? 'Spinning…' : 'Spin'}
                </button>
              </div>
            </div>
            <BettingBoard bets={bets} onPlace={place} disabled={spinning} winning={shown} />
            <div className="flex flex-wrap justify-between gap-2 font-mono text-sm">
              <span className="text-muted">Total bet: <span className="num text-neon">{total}</span></span>
              {error && <span className="text-warn" role="alert">{error}</span>}
            </div>
          </div>
        }
      >
        <div className="grid items-center gap-6 md:grid-cols-[320px_1fr]">
          <Wheel rotation={rotation} ballAngle={ball} spinning={spinning && !reduce} durationS={SPIN_S} onSettled={land} winning={shown} />
          <div className="space-y-2 text-center md:text-left" aria-live="polite">
            <p className="font-mono text-xs uppercase tracking-wider text-muted">{spinning ? 'no more bets' : 'result'}</p>
            <p className={`num text-6xl font-extrabold ${lastColor === 'red' ? 'text-lose' : lastColor === 'green' ? 'text-win' : 'text-fg'}`}>
              {spinning ? '··' : shown ?? '--'}
            </p>
            {shown !== null && !spinning && <p className="font-mono text-sm text-muted">{lastColor}{shown !== 0 && ` · ${shown % 2 ? 'odd' : 'even'} · ${shown <= 18 ? '1–18' : '19–36'}`}</p>}
          </div>
        </div>
      </Table>
      <ResultToast result={toast} message={toast ? `${toast.outcome.number} ${toast.outcome.color}` : undefined} onDismiss={() => setToast(null)} />
    </div>
  )
}
