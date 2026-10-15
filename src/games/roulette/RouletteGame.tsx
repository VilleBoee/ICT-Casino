import { useCallback, useEffect, useRef, useState } from 'react'
import { errorText } from '../../i18n/errors'
import { useReducedMotion } from 'framer-motion'
import { Chip, DENOMINATIONS, ResultToast, Table, type Denomination } from '../../components'
import { colorOf, spin, type RouletteOutcome } from '../../engine/roulette'
import type { RoundResult } from '../../engine/types'
import { useWallet } from '../../app/wallet'
import { play, playLoop, type LoopHandle } from '../../app/sound'
import { BettingBoard } from './BettingBoard'
import { Wheel } from './Wheel'
import { spotKey, toEngineBets, totalOf, type BetMap, type Spot } from './bets'
import { BALL_PHASES, QUICK_SPIN_S, SPIN_S, planSpin } from './wheelMath'
import { useT } from '../../i18n'

const HISTORY = 14
const DOT = { red: 'bg-[#b91c3a]', black: 'bg-surface-2 border border-border', green: 'bg-[#0f8a4a]' } as const

export default function RouletteGame() {
  const { balance, wallet } = useWallet()
  const t = useT()
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
    if (total + chip > balance) { setError(t('rl.noChips')); return }
    setError(null)
    const k = spotKey(s)
    setBets((b) => ({ ...b, [k]: { spot: s, amount: (b[k]?.amount ?? 0) + chip } }))
  }

  const loop = useRef<{ h: LoopHandle; raf: number; dropped: boolean } | null>(null)
  const stopSpinSound = () => { if (loop.current) { cancelAnimationFrame(loop.current.raf); loop.current.h.stop(); loop.current = null } }
  /** Looping spin sound for the whole spin: slows and quietens with the wheel, fades just before the ball drops. */
  const startSpinSound = () => {
    stopSpinSound()
    const h = playLoop('spin')
    const t0 = performance.now(), fadeAt = BALL_PHASES.drop - 0.04
    const st = { h, raf: 0, dropped: false }
    const tick = () => {
      const p = (performance.now() - t0) / 1000 / SPIN_S
      if (p < fadeAt) {
        const v = 1 - (1 - p) ** 2 // ~ how much speed is gone
        h.update(1 - 0.45 * v, 1 - 0.6 * v)
      } else if (!st.dropped) {
        st.dropped = true; h.fadeOut(400)
        setTimeout(() => play('ball'), 400)
        return
      }
      st.raf = requestAnimationFrame(tick)
    }
    st.raf = requestAnimationFrame(tick)
    loop.current = st
  }
  useEffect(() => () => stopSpinSound(), [])

  /** Called exactly once when the ball lands (after the quick 1.5 s spin under reduced motion). */
  const land = useCallback(() => {
    const r = pending.current
    if (!r) return
    pending.current = null
    stopSpinSound()
    if (reduce) play('ball')
    wallet.settle(r)
    setShown(r.outcome.number)
    setHistory((h) => [r.outcome.number, ...h].slice(0, HISTORY))
    setToast(r)
    setSpinning(false)
  }, [wallet, reduce])

  const doSpin = () => {
    if (spinning || total === 0) return
    let r: RoundResult<RouletteOutcome>
    try { r = spin(wallet, toEngineBets(bets)) } catch (e) { setError(errorText(e, t)); return }
    setError(null)
    pending.current = r
    setLastBets(bets)
    setShown(null)
    setToast(null)
    // random wheel stop; the ball's end angle is computed to sit over the winning pocket
    const plan = planSpin(rotation, ball, r.outcome.number)
    setRotation(plan.rotation)
    setBall(plan.ball)
    setSpinning(true)
    if (!reduce) startSpinSound()
  }

  const rebet = () => {
    if (totalOf(lastBets) <= balance) { setBets(lastBets); setError(null) } else setError(t('rl.noRebet'))
  }
  const lastColor = shown === null ? null : colorOf(shown)

  return (
    <div className="space-y-4">
      <Table
        title="roulette.tsx"
        subtitle={t('rl.subtitle')}
        actions={
          <div className="flex items-center gap-1" aria-label={t('rl.recent')}>
            {history.length === 0 && <span className="font-mono text-xs text-muted">{t('rl.noSpins')}</span>}
            {history.map((n, i) => (
              <span key={i} className={`grid h-6 w-6 place-items-center rounded font-mono text-[11px] font-bold ${DOT[colorOf(n)]} ${i === 0 ? 'ring-1 ring-neon' : 'opacity-80'}`}>{n}</span>
            ))}
          </div>
        }
        footer={
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('rl.chipValue')}>
              {DENOMINATIONS.map((d) => (
                <Chip key={d} value={d} size={44} selected={chip === d} disabled={spinning || d > balance - total} onClick={() => setChip(d)} />
              ))}
              <div className="ml-auto flex flex-wrap gap-2">
                <button type="button" className="btn-ghost" disabled={spinning || total === 0} onClick={() => setBets({})}>{t('bet.clear')}</button>
                <button type="button" className="btn-ghost" disabled={spinning || totalOf(lastBets) === 0} onClick={rebet}>{t('bet.rebet')}</button>
                <button type="button" className="btn-primary min-w-28" disabled={spinning || total === 0} onClick={doSpin}>
                  {spinning ? t('rl.spinning') : t('rl.spin')}
                </button>
              </div>
            </div>
            <BettingBoard bets={bets} onPlace={place} disabled={spinning} winning={shown} />
            <div className="flex flex-wrap justify-between gap-2 font-mono text-sm">
              <span className="text-muted">{t('rl.total')} <span className="num text-neon">{total}</span></span>
              {error && <span className="text-warn" role="alert">{error}</span>}
            </div>
          </div>
        }
      >
        <div className="grid items-center gap-6 md:grid-cols-[320px_1fr]">
          <Wheel rotation={rotation} ballAngle={ball} spinning={spinning} durationS={reduce ? QUICK_SPIN_S : SPIN_S} onSettled={land} winning={shown} />
          <div className="space-y-2 text-center md:text-left" aria-live="polite">
            <p className="font-mono text-xs uppercase tracking-wider text-muted">{spinning ? t('rl.noMore') : t('rl.result')}</p>
            <p className={`num text-6xl font-extrabold ${lastColor === 'red' ? 'text-lose' : lastColor === 'green' ? 'text-win' : 'text-fg'}`}>
              {spinning ? '··' : shown ?? '--'}
            </p>
            {shown !== null && !spinning && <p className="font-mono text-sm text-muted">{lastColor && t(`rl.${lastColor}`)}{shown !== 0 && ` · ${shown % 2 ? t('rl.odd') : t('rl.even')} · ${shown <= 18 ? '1–18' : '19–36'}`}</p>}
          </div>
        </div>
      </Table>
      <ResultToast result={toast} message={toast ? `${toast.outcome.number} ${t(`rl.${toast.outcome.color}`)}` : undefined} onDismiss={() => setToast(null)} />
    </div>
  )
}
