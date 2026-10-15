import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Card, ResultToast, Table } from '../../components'
import { useWallet } from '../../app/wallet'
import { play } from '../../app/sound'
import { HoldemTable, type PokerAction } from '../../engine/holdem'
import type { Chips, RoundResult } from '../../engine/types'
import { ActionBar } from './ActionBar'
import { BuyIn } from './BuyIn'
import { SeatView } from './SeatView'
import { blindSeats, seatPosition } from './layout'
import { PHONE, useMediaQuery } from '../../app/useMediaQuery'

const BIG_BLIND = 20
const BLIND_SCHEDULE = { everyHands: 10, factor: 1.5 } as const
const STREET_PAUSE_MS = 600

/** Chips for money in, a tick for checks, a card swish for folds. */
function actionSound(type: PokerAction['type']) {
  play(type === 'fold' ? 'flip' : type === 'check' ? 'tick' : 'chip')
}
/** Jingle if you won the hand that just ended. */
function handOverSound(t: HoldemTable) {
  if (t.phase !== 'handOver' || !t.lastHand) return
  play((t.lastHand.won[0] ?? 0) > 0 ? 'win' : 'lose', { volume: 0.4 })
}

/** Plays out the hand (human folds) and cashes out, so leaving never strands chips. */
function forceClose(t: HoldemTable) {
  if (t.phase === 'closed') return null
  let guard = 0
  while (t.inHand && guard++ < 1000) { if (t.isHumanTurn) t.act({ type: 'fold' }); else t.botStep() }
  return t.cashOut()
}

export default function HoldemGame() {
  const { balance, wallet } = useWallet()
  const reduce = useReducedMotion()
  const phone = useMediaQuery(PHONE)
  const narrow = useMediaQuery('(max-width: 1023.98px)')
  const table = useRef<HoldemTable | null>(null)
  const [version, bump] = useReducer((x: number) => x + 1, 0)
  const [thinking, setThinking] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<{ hands: number; net: Chips } | null>(null)
  const [toast, setToast] = useState<RoundResult | null>(null)
  const [rebuyOpen, setRebuyOpen] = useState(false)
  const boardLen = useRef(0)
  const t = table.current

  // Leaving the page: settle whatever is on the table.
  useEffect(() => () => {
    const tb = table.current
    if (tb) { const r = forceClose(tb); if (r) wallet.settle(r) }
  }, [wallet])

  // Bot turns: one move per tick with a visible "thinking" delay; pause briefly when a new street is dealt.
  useEffect(() => {
    if (!t || !t.isBotTurn) { setThinking(null); return }
    const seat = t.toAct!
    const newStreet = t.board.length !== boardLen.current
    boardLen.current = t.board.length
    // engine suggests the pause; add a little jitter so bots don't feel robotic
    const base = t.getState().botDelayMs
    const delay = (reduce ? 200 : base * (0.75 + Math.random() * 0.6)) + (newStreet && !reduce ? STREET_PAUSE_MS : 0)
    setThinking(seat)
    const id = setTimeout(() => { const mv = t.botStep(); if (mv) actionSound(mv.action.type); handOverSound(t); setThinking(null); bump() }, delay)
    return () => clearTimeout(id)
  }, [version, t, reduce])

  const sit = (buyIn: Chips, bots: number, rising: boolean) => {
    try {
      const tb = new HoldemTable(wallet, { buyIn, bots, bigBlind: BIG_BLIND, ...(rising ? { blindSchedule: BLIND_SCHEDULE } : {}) })
      table.current = tb
      boardLen.current = 0
      tb.startHand()
      setError(null); setToast(null)
      bump()
    } catch (e) { setError((e as Error).message) }
  }

  const act = useCallback((a: PokerAction) => {
    const tb = table.current
    if (!tb?.isHumanTurn) return
    try { tb.act(a); actionSound(a.type); handOverSound(tb); setError(null) } catch (e) { setError((e as Error).message) }
    bump()
  }, [])

  const nextHand = () => {
    if (!t) return
    try { t.startHand(); boardLen.current = 0; setError(null) } catch (e) { setError((e as Error).message) }
    bump()
  }

  const cashOut = () => {
    if (!t || t.inHand) return
    const r = t.cashOut()
    wallet.settle(r)
    setSession({ hands: r.outcome.hands, net: r.outcome.net })
    setToast(r)
    table.current = null
    bump()
  }

  const rebuy = (amount: Chips) => {
    if (!t) return
    try { t.rebuy(amount); setRebuyOpen(false); setError(null) } catch (e) { setError((e as Error).message) }
    bump()
  }

  // Keyboard: F fold, C check/call, R raise min / bet min
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tb = table.current
      if (!tb?.isHumanTurn || e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement)?.closest('input')) return
      const l = tb.legalActions()
      const k = e.key.toLowerCase()
      if (k === 'f') act({ type: 'fold' })
      else if (k === 'c') act(l.check ? { type: 'check' } : { type: 'call' })
      else if (k === 'r' && l.raise) act({ type: l.raise.kind, to: l.raise.min })
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [act])

  if (!t) {
    return (
      <div className="space-y-4">
        <BuyIn balance={balance} bigBlind={BIG_BLIND} onSit={sit} error={error} lastSession={session} />
        <ResultToast result={toast} message="Cashed out" onDismiss={() => setToast(null)} />
      </div>
    )
  }

  const n = t.seats.length
  // compact list on phones, and on tablets when the oval would be crowded (8 bots)
  const compact = phone || (narrow && n >= 9)
  const over = t.phase === 'handOver'
  const last = over ? t.lastHand : null
  const shown = new Map(last?.shown.map((s) => [s.seat, s.hand.name]) ?? [])
  const winners = new Set(last?.pots.flatMap((p) => p.winners) ?? [])
  const { sb, bb } = blindSeats(t.dealer, n)
  const pots = t.pots
  const human = t.human
  const net = human.stack - t.totalBuyIn
  const topWin = last?.pots[0]
  const sched = t.blindSchedule
  const blindInfo = sched
    ? ` · level ${Math.floor((t.handNo - 1) / sched.everyHands) + 1} (up in ${sched.everyHands - ((t.handNo - 1) % sched.everyHands)})`
    : ''

  return (
    <div className="space-y-4">
      <Table
        title="holdem.tsx"
        subtitle={`NL ${t.smallBlind}/${t.bigBlind}${blindInfo} · hand #${t.handNo} · ${t.phase === 'handOver' ? 'hand over' : t.phase}`}
        actions={
          <span className="font-mono text-xs">
            <span className="text-muted">session </span>
            <span className={net >= 0 ? 'text-win' : 'text-lose'}>{net >= 0 ? '+' : ''}{net}</span>
          </span>
        }
        footer={
          <div className="space-y-3">
            {t.isHumanTurn ? (
              <ActionBar legal={t.legalActions()} currentBet={t.currentBet} pot={t.pot} stack={human.stack} onAct={act} />
            ) : over ? (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="btn-primary" disabled={human.stack === 0} onClick={nextHand}>Next hand</button>
                <button type="button" className="btn-ghost" onClick={() => setRebuyOpen((o) => !o)} aria-expanded={rebuyOpen}>Rebuy</button>
                <button type="button" className="btn-ghost ml-auto" onClick={cashOut}>Cash out {human.stack}</button>
              </div>
            ) : (
              <p className="font-mono text-sm text-muted" aria-live="polite">
                {thinking !== null ? <>waiting for <span className="text-cyan">@{t.seats[thinking].name}</span>…</> : human.folded ? 'you folded — watching the hand' : '…'}
              </p>
            )}
            {over && rebuyOpen && (
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Rebuy">
                {[200, 500, 1000].map((a) => (
                  <button key={a} type="button" className="btn-ghost" disabled={a > balance} onClick={() => rebuy(a)}>+{a}</button>
                ))}
                <span className="font-mono text-xs text-muted">wallet {balance}</span>
              </div>
            )}
            {over && human.stack === 0 && !rebuyOpen && <p className="text-sm text-warn">You're out of chips. Rebuy or cash out.</p>}
            {error && <p role="alert" className="text-sm text-lose">{error}</p>}
          </div>
        }
      >
        {compact ? (
          /* phones: bots as a compact 2-column list, board in the middle, you at the bottom */
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {t.seats.filter((s) => !s.human).map((s) => (
                <SeatView key={s.index} compact seat={s} pos={{ left: 0, top: 0 }}
              dealer={s.index === t.dealer}
              blind={s.index === sb ? 'SB' : s.index === bb ? 'BB' : null}
              toAct={t.toAct === s.index}
              thinking={thinking === s.index}
              reveal={over && shown.has(s.index)}
              winner={over && winners.has(s.index)}
              handName={over ? shown.get(s.index) : undefined}
              won={over ? last?.won[s.index] : undefined}
              handNo={t.handNo} />
              ))}
            </div>
            <div className="rounded-[2rem] border-2 border-[#1c3a2c] bg-[radial-gradient(ellipse_at_center,#0f3b28,#08160f_80%)] px-2 py-3">
              {/* board + pot */}
          <div className={`flex flex-col items-center gap-2 ${compact ? 'py-1' : 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'}`} aria-label="Board">
            <div className="flex flex-wrap items-center justify-center gap-1 font-mono text-xs" aria-live="polite">
              {pots.length === 0 ? null : pots.length === 1 || over
                ? <span className="rounded-full border border-neon/50 bg-bg/80 px-3 py-0.5 text-neon">pot <span className="num">{t.pot}</span></span>
                : pots.map((p, i) => (
                  <span key={i} className="rounded-full border border-neon/50 bg-bg/80 px-2 py-0.5 text-neon">{i === 0 ? 'main' : `side ${i}`} <span className="num">{p.amount}</span></span>
                ))}
            </div>
            <div className="flex min-h-[4.5rem] gap-1" key={t.handNo}>
              {t.board.map((c, i) => (
                <Card key={i} card={c} size="sm" dealIndex={i < 3 ? i : 0}
                  highlight={false} />
              ))}
            </div>
            {over && topWin && (
              <p className="rounded bg-bg/85 px-2 py-0.5 text-center font-mono text-xs sm:text-sm" role="status">
                <span className="text-win">{topWin.winners.map((w) => t.seats[w].human ? 'You' : `@${t.seats[w].name}`).join(' & ')}</span>
                {' '}win{topWin.winners.length === 1 && !t.seats[topWin.winners[0]].human ? 's' : ''} {topWin.amount}
                {topWin.hand && <> with <span className="font-bold text-neon">{topWin.hand}</span></>}
                {last && last.pots.length > 1 && <span className="text-muted"> (+{last.pots.length - 1} side pot{last.pots.length > 2 ? 's' : ''})</span>}
              </p>
            )}
          </div>
            </div>
            <SeatView compact seat={human} pos={{ left: 50, top: 90 }}
              dealer={0 === t.dealer}
              blind={0 === sb ? 'SB' : 0 === bb ? 'BB' : null}
              toAct={t.toAct === 0}
              thinking={thinking === 0}
              reveal={over && shown.has(0)}
              winner={over && winners.has(0)}
              handName={over ? shown.get(0) : undefined}
              won={over ? last?.won[0] : undefined}
              handNo={t.handNo} />
          </div>
        ) : (
        <div className={`relative mx-auto aspect-[4/5] w-full max-w-4xl ${n >= 8 ? "sm:aspect-[4/3] lg:aspect-[16/10] lg:my-4" : "sm:aspect-[16/9]"}`}>
            {/* felt */}
            <div className="absolute inset-[12%_8%] rounded-[50%] border-4 border-[#1c3a2c] bg-[radial-gradient(ellipse_at_center,#0f3b28,#08160f_75%)] shadow-[inset_0_0_40px_rgb(0_0_0/.6)]" aria-hidden />
            {/* board + pot */}
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2" aria-label="Board">
              <div className="flex flex-wrap items-center justify-center gap-1 font-mono text-xs" aria-live="polite">
                {pots.length === 0 ? null : pots.length === 1 || over
                  ? <span className="rounded-full border border-neon/50 bg-bg/80 px-3 py-0.5 text-neon">pot <span className="num">{t.pot}</span></span>
                  : pots.map((p, i) => (
                    <span key={i} className="rounded-full border border-neon/50 bg-bg/80 px-2 py-0.5 text-neon">{i === 0 ? 'main' : `side ${i}`} <span className="num">{p.amount}</span></span>
                  ))}
              </div>
              <div className="flex min-h-[4.5rem] gap-1" key={t.handNo}>
                {t.board.map((c, i) => (
                  <Card key={i} card={c} size="sm" dealIndex={i < 3 ? i : 0}
                    highlight={false} />
                ))}
              </div>
              {over && topWin && (
                <p className="rounded bg-bg/85 px-2 py-0.5 text-center font-mono text-xs sm:text-sm" role="status">
                  <span className="text-win">{topWin.winners.map((w) => t.seats[w].human ? 'You' : `@${t.seats[w].name}`).join(' & ')}</span>
                  {' '}win{topWin.winners.length === 1 && !t.seats[topWin.winners[0]].human ? 's' : ''} {topWin.amount}
                  {topWin.hand && <> with <span className="font-bold text-neon">{topWin.hand}</span></>}
                  {last && last.pots.length > 1 && <span className="text-muted"> (+{last.pots.length - 1} side pot{last.pots.length > 2 ? 's' : ''})</span>}
                </p>
              )}
            </div>
            {t.seats.map((s) => (
              <SeatView
                key={s.index}
                seat={s}
                pos={seatPosition(s.index, n, n >= 9 ? 46 : 44, n >= 9 ? 42 : 40)}
                dealer={s.index === t.dealer}
                blind={s.index === sb ? 'SB' : s.index === bb ? 'BB' : null}
                toAct={t.toAct === s.index}
                thinking={thinking === s.index}
                reveal={over && shown.has(s.index)}
                winner={over && winners.has(s.index)}
                handName={over ? shown.get(s.index) : undefined}
                won={over ? last?.won[s.index] : undefined}
                handNo={t.handNo}
              />
            ))}
          </div>
        )}
      </Table>
    </div>
  )
}
