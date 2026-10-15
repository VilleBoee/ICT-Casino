import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { PHONE, useMediaQuery } from '../../app/useMediaQuery'
import { Card, CountUp, ResultToast, Table } from '../../components'
import { useWallet } from '../../app/wallet'
import { VideoPokerRound, type VideoPokerOutcome, type VpHand } from '../../engine/videopoker'
import type { Card as EngineCard, Chips, RoundResult } from '../../engine/types'
import { COINS, VP_ROWS, holdKey, payFor } from './paytable'

const COIN_VALUES = [1, 5, 25, 100] as const
const FLIP_MS = 450
const STAGGER_MS = 110

type Phase = 'idle' | 'dealing' | 'hold' | 'drawing' | 'done'
interface Slot { card: EngineCard; faceDown: boolean }

export default function VideoPokerGame() {
  const { balance, wallet } = useWallet()
  const reduce = useReducedMotion()
  // phones: only the current coin column of the paytable, and smaller cards so 5 fit in 360px
  const phone = useMediaQuery(PHONE)
  const [coins, setCoins] = useState<number>(5)
  const [coinValue, setCoinValue] = useState<Chips>(1)
  const [phase, setPhase] = useState<Phase>('idle')
  const [slots, setSlots] = useState<Slot[]>([])
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false])
  const [hint, setHint] = useState<VpHand | null>(null)
  const [final, setFinal] = useState<RoundResult<VideoPokerOutcome> | null>(null)
  const [toast, setToast] = useState<RoundResult<VideoPokerOutcome> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dealId, setDealId] = useState(0)
  const round = useRef<VideoPokerRound | null>(null)
  const pending = useRef<RoundResult<VideoPokerOutcome> | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const bet = coins * coinValue

  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)) }
  useEffect(() => () => {
    timers.current.forEach(clearTimeout)
    // leaving mid-round: auto-draw (holding what's held) so the round is always settled
    const r = round.current
    if (pending.current) wallet.settle(pending.current)
    else if (r && r.phase === 'dealt') wallet.settle(r.draw())
  }, [wallet])

  const settle = useCallback(() => {
    const r = pending.current
    if (!r) return
    pending.current = null
    wallet.settle(r)
    setFinal(r)
    if (r.payout > 0) setToast(r)
    setPhase('done')
  }, [wallet])

  const deal = () => {
    if (phase === 'dealing' || phase === 'hold' || phase === 'drawing') return
    let r: VideoPokerRound
    try { r = new VideoPokerRound(wallet, { coins, coinSize: coinValue }) } catch (e) { setError((e as Error).message); return }
    round.current = r
    setError(null); setToast(null); setFinal(null)
    setHeld([false, false, false, false, false])
    setDealId((d) => d + 1)
    setHint(r.currentHand === 'Nothing' ? null : r.currentHand)
    if (reduce) { setSlots(r.cards.map((card) => ({ card, faceDown: false }))); setPhase('hold'); return }
    setSlots(r.cards.map((card) => ({ card, faceDown: true })))
    setPhase('dealing')
    r.cards.forEach((_, i) => later(() => setSlots((s) => s.map((x, j) => (j === i ? { ...x, faceDown: false } : x))), 350 + i * STAGGER_MS))
    later(() => setPhase('hold'), 350 + 5 * STAGGER_MS + FLIP_MS)
  }

  const toggle = useCallback((i: number) => {
    const r = round.current
    if (phase !== 'hold' || !r) return
    r.toggleHold(i)
    setHeld([...r.held])
  }, [phase])

  const draw = useCallback(() => {
    const r = round.current
    if (phase !== 'hold' || !r) return
    const res = r.draw()
    pending.current = res
    const replaced = res.outcome.held.map((h) => !h)
    if (reduce || replaced.every((x) => !x)) {
      setSlots(res.outcome.cards.map((card) => ({ card, faceDown: false })))
      settle()
      return
    }
    setPhase('drawing')
    // 1) flip unheld cards face down
    setSlots((s) => s.map((x, i) => (replaced[i] ? { ...x, faceDown: true } : x)))
    // 2) swap in the new cards while hidden, 3) flip them up one by one
    later(() => setSlots((s) => s.map((x, i) => (replaced[i] ? { card: res.outcome.cards[i], faceDown: true } : x))), FLIP_MS)
    let k = 0
    replaced.forEach((rep, i) => {
      if (!rep) return
      later(() => setSlots((s) => s.map((x, j) => (j === i ? { ...x, faceDown: false } : x))), FLIP_MS + 80 + k++ * STAGGER_MS)
    })
    later(settle, FLIP_MS + 80 + k * STAGGER_MS + FLIP_MS)
  }, [phase, reduce, settle])

  // Keys: 1–5 hold, Enter/Space deal or draw
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement)?.closest('input,select')) return
      const i = holdKey(e.key)
      if (i !== null) { e.preventDefault(); toggle(i); return }
      if ((e.key === 'Enter' || e.code === 'Space') && !(e.target as HTMLElement)?.closest('button')) {
        e.preventDefault()
        if (phase === 'hold') draw()
        else if (phase === 'idle' || phase === 'done') document.getElementById('vp-deal')?.click()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, draw, phase])

  const busy = phase === 'dealing' || phase === 'drawing'
  const lit: VpHand | null = phase === 'done' ? (final?.outcome.hand ?? null) : phase === 'hold' ? hint : null

  return (
    <div className="space-y-4">
      <Table
        title="video-poker.tsx"
        subtitle="Jacks or Better · 9/6 full pay · royal 4000 at max coins"
        actions={<span className="font-mono text-xs text-muted">keys: 1–5 hold · ⏎ deal/draw</span>}
        footer={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1" role="group" aria-label="Coins">
              <span className="mr-1 font-mono text-xs uppercase text-muted">coins</span>
              {COINS.map((c) => (
                <button key={c} type="button" aria-pressed={coins === c} disabled={phase === 'hold' || busy || c * coinValue > balance}
                  className={`${coins === c ? 'btn-secondary' : 'btn-ghost'} px-3`} onClick={() => setCoins(c)}>{c}</button>
              ))}
            </div>
            <label className="flex items-center gap-1 font-mono text-xs text-muted">
              coin
              <select value={coinValue} disabled={phase === 'hold' || busy} onChange={(e) => setCoinValue(Number(e.target.value))}
                className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-sm text-fg">
                {COIN_VALUES.map((v) => <option key={v} value={v} disabled={v * coins > balance}>{v}</option>)}
              </select>
            </label>
            <span className="font-mono text-sm text-muted">bet <span className="num text-neon">{bet}</span></span>
            <div className="ml-auto flex gap-2">
              {phase === 'hold' || phase === 'drawing' ? (
                <button type="button" className="btn-primary min-w-28" disabled={busy} onClick={draw}>Draw</button>
              ) : (
                <button id="vp-deal" type="button" className="btn-primary min-w-28" disabled={busy || bet > balance} onClick={deal}>
                  {phase === 'done' ? 'Deal again' : 'Deal'}
                </button>
              )}
            </div>
            {error && <p role="alert" className="w-full text-sm text-warn">{error}</p>}
          </div>
        }
      >
        <div className="space-y-6">
          {/* paytable */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse sm:min-w-[420px] font-mono text-xs sm:text-sm" aria-label="Paytable">
              <thead>
                <tr className="text-muted">
                  <th className="px-2 py-1 text-left font-normal">hand</th>
                  {COINS.map((c) => (
                    <th key={c} scope="col" className={`px-2 py-1 text-right font-normal ${c === coins ? 'bg-cyan/15 text-cyan' : 'hidden sm:table-cell'}`}>{c} coin{c > 1 && 's'}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {VP_ROWS.map((h) => {
                  const on = lit === h
                  const win = on && phase === 'done'
                  return (
                    <tr key={h} aria-current={on || undefined}
                      className={`border-t border-border/60 transition-colors ${win ? 'bg-win/20 text-win' : on ? 'bg-neon/10 text-neon' : 'text-fg'}`}>
                      <th scope="row" className="px-2 py-1 text-left font-semibold">{h}{win && ' ◀'}</th>
                      {COINS.map((c) => (
                        <td key={c} className={`num px-2 py-1 text-right ${c === coins ? (win ? 'bg-win/25 font-bold' : 'bg-cyan/10') : 'hidden sm:table-cell'}`}>{payFor(h, c)}</td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* cards */}
          <div className="flex justify-center gap-2 sm:gap-3" key={dealId}>
            {slots.length === 0
              ? <p className="py-10 font-mono text-sm text-muted">// choose your bet and deal</p>
              : slots.map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <span className={`h-5 rounded px-2 font-mono text-[11px] font-bold ${held[i] ? 'bg-neon text-bg' : 'text-transparent'}`} aria-hidden={!held[i]}>HOLD</span>
                  <button type="button" onClick={() => toggle(i)} disabled={phase !== 'hold'} aria-pressed={held[i]}
                    aria-label={`Card ${i + 1}${held[i] ? ', held' : ''}`}
                    className={`rounded-md transition-transform disabled:cursor-default ${held[i] ? '-translate-y-2 ring-2 ring-neon ring-offset-2 ring-offset-bg' : ''}`}>
                    <Card card={s.card} faceDown={s.faceDown} size={phone ? 'sm' : 'lg'} dealIndex={i}
                      highlight={phase === 'done' && !!final && final.payout > 0} />
                  </button>
                  <kbd className="font-mono text-[10px] text-muted">{i + 1}</kbd>
                </div>
              ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-center" aria-live="polite">
            {phase === 'hold' && <p className="font-mono text-sm text-muted">{hint ? <>you have <span className="text-neon">{hint}</span></> : 'select cards to hold, then draw'}</p>}
            {phase === 'done' && final && (
              <p className="font-mono text-lg">
                <span className={final.payout > 0 ? 'text-win' : 'text-muted'}>{final.outcome.hand === 'Nothing' ? 'No win' : final.outcome.hand}</span>
                {final.payout > 0 && <> · {final.outcome.coinsWon} coins · <CountUp value={final.payout} className="num text-win" /><span className="sr-only">{final.payout} chips</span></>}
              </p>
            )}
          </div>
        </div>
      </Table>
      <ResultToast result={toast} message={toast?.outcome.hand} onDismiss={() => setToast(null)} />
    </div>
  )
}
