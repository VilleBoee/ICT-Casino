import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useT, type Key } from '../../i18n'
import { errorText } from '../../i18n/errors'
import { useReducedMotion } from 'framer-motion'
import { Card, Chip, DENOMINATIONS, ResultToast, Table, fmtChips, type Denomination } from '../../components'
import { useWallet } from '../../app/wallet'
import { playBaccarat, type BaccaratBets, type BaccaratOutcome, type BaccaratSide, type BaccaratWinner } from '../../engine/baccarat'
import { Shoe } from '../../engine/cards'
import type { RoundResult } from '../../engine/types'
import { Roads } from './Roads'
import { revealSteps, visibleAfter } from './reveal'

const STEP_MS = 650
const THIRD_PAUSE_MS = 500
const SPOTS: { side: BaccaratSide; label: Key; pays: string; cls: string }[] = [
  { side: 'player', label: 'bc.PLAYER', pays: '1:1', cls: 'border-cyan text-cyan' },
  { side: 'tie', label: 'bc.TIE', pays: '8:1', cls: 'border-win text-win' },
  { side: 'banker', label: 'bc.BANKER', pays: '0.95:1', cls: 'border-lose text-lose' },
]
const sum = (b: BaccaratBets) => (b.player ?? 0) + (b.banker ?? 0) + (b.tie ?? 0)

export default function BaccaratGame() {
  const { balance, wallet } = useWallet()
  const reduce = useReducedMotion()
  const t = useT()
  const shoe = useMemo(() => new Shoe(8), []) // one 8-deck shoe per table
  const [chip, setChip] = useState<Denomination>(25)
  const [bets, setBets] = useState<BaccaratBets>({})
  const [lastBets, setLastBets] = useState<BaccaratBets>({})
  const [round, setRound] = useState<RoundResult<BaccaratOutcome> | null>(null)
  const [shown, setShown] = useState(0)
  const [revealing, setRevealing] = useState(false)
  const [history, setHistory] = useState<BaccaratWinner[]>([])
  const [toast, setToast] = useState<RoundResult<BaccaratOutcome> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef<RoundResult<BaccaratOutcome> | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const total = sum(bets)

  useEffect(() => () => { timers.current.forEach(clearTimeout); if (pending.current) wallet.settle(pending.current) }, [wallet])

  const settle = useCallback(() => {
    const r = pending.current
    if (!r) return
    pending.current = null
    wallet.settle(r)
    setHistory((h) => [...h, r.outcome.winner])
    setToast(r)
    setRevealing(false)
  }, [wallet])

  const place = (side: BaccaratSide) => {
    if (revealing) return
    if (total + chip > balance) { setError(t('bc.noChips')); return }
    setError(null)
    if (round && !revealing) setRound(null) // clear last coup when betting again
    setBets((b) => ({ ...b, [side]: (b[side] ?? 0) + chip }))
  }

  const deal = () => {
    if (revealing || total === 0) return
    if (shoe.needsShuffle) { shoe.reshuffle(); setHistory([]) }
    let r: RoundResult<BaccaratOutcome>
    try { r = playBaccarat(wallet, bets, shoe) } catch (e) { setError(errorText(e, t)); return }
    setError(null); setToast(null); setLastBets(bets)
    pending.current = r
    setRound(r)
    const steps = revealSteps(r.outcome)
    if (reduce) { setShown(steps.length); settle(); return }
    setRevealing(true)
    setShown(0)
    let at = 200
    steps.forEach((_, i) => {
      if (i === 4) at += THIRD_PAUSE_MS // third cards come after a beat, like at a real table
      timers.current.push(setTimeout(() => setShown(i + 1), at))
      at += STEP_MS
    })
    timers.current.push(setTimeout(settle, at + 300))
  }

  const newRound = () => { setBets({}); setRound(null) }

  const vis = round ? visibleAfter(round.outcome, shown) : null
  const done = !!round && !revealing && !pending.current
  const winner = done ? round!.outcome.winner : null

  const hand = (side: 'player' | 'banker') => {
    const cards = vis?.[side] ?? []
    const sum = side === 'player' ? vis?.playerTotal : vis?.bankerTotal
    const won = winner === side
    return (
      <section aria-label={t(`bc.${side}`)} className={`flex-1 space-y-2 rounded-lg border p-3 transition-colors ${won ? (side === 'player' ? 'border-cyan shadow-glow-cyan' : 'border-lose shadow-[0_0_18px_rgb(248_113_113/.35)]') : 'border-border/50'}`}>
        <p className={`flex items-baseline justify-between font-mono text-xs uppercase tracking-wider ${side === 'player' ? 'text-cyan' : 'text-lose'}`}>
          {t(`bc.${side}`)}
          <span className="num text-3xl text-fg" aria-label={t('bc.total', { side: t(`bc.${side}`) })}>{sum ?? '–'}</span>
        </p>
        <div className="flex min-h-24 gap-2">
          {cards.map((c, i) => (
            <div key={`${round?.roundId}-${i}`} className={i === 2 ? 'ml-2 rotate-90 self-center' : ''}>
              <Card card={c} dealIndex={0} />
            </div>
          ))}
        </div>
        {done && round!.outcome.natural && round!.outcome[side === 'player' ? 'playerTotal' : 'bankerTotal'] >= 8 && (
          <p className="font-mono text-xs text-neon">{t('bc.natural')}</p>
        )}
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <Table
        title="baccarat.tsx"
        subtitle={t('bc.subtitle')}
        footer={
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('rl.chipValue')}>
              {DENOMINATIONS.map((d) => (
                <Chip key={d} value={d} size={44} selected={chip === d} disabled={revealing || d > balance - total} onClick={() => setChip(d)} />
              ))}
              <div className="ml-auto flex flex-wrap gap-2">
                <button type="button" className="btn-ghost" disabled={revealing || total === 0} onClick={newRound}>{t('bet.clear')}</button>
                <button type="button" className="btn-ghost" disabled={revealing || sum(lastBets) === 0 || sum(lastBets) > balance}
                  onClick={() => { setBets(lastBets); setRound(null) }}>{t('bet.rebet')}</button>
                <button type="button" className="btn-primary min-w-24" disabled={revealing || total === 0 || total > balance} onClick={deal}>{t('bj.deal')}</button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SPOTS.map(({ side, label, pays, cls }) => {
                const amt = bets[side]
                const res = done ? round!.outcome.bets.find((b) => b.side === side) : undefined
                return (
                  <button key={side} type="button" data-sfx="chip" disabled={revealing} onClick={() => place(side)}
                    aria-label={`${t('bc.betAria', { side: t(`bc.${side}`), pays })}${amt ? t('bc.placed', { n: amt }) : ''}`}
                    className={`relative flex min-h-20 flex-col items-center justify-center rounded-lg border-2 bg-bg/40 font-mono transition-colors hover:bg-surface-2 disabled:cursor-not-allowed ${cls} ${winner === side ? 'bg-surface-2 shadow-glow-neon' : ''}`}>
                    <span className="text-sm font-extrabold sm:text-base">{t(label)}</span>
                    <span className="text-[10px] opacity-80">{t('bc.pays', { pays })}</span>
                    {amt ? (
                      <span className="absolute right-1.5 top-1.5 grid h-7 min-w-7 place-items-center rounded-full border-2 border-current bg-bg px-1 text-[11px] font-bold">{fmtChips(amt)}</span>
                    ) : null}
                    {res && (
                      <span className={`mt-1 text-xs font-bold ${res.payout > res.amount ? 'text-win' : res.payout === res.amount ? 'text-cyan' : 'text-lose'}`}>
                        {res.payout > res.amount ? `+${res.payout - res.amount}` : res.payout === res.amount ? t('bc.push') : `-${res.amount}`}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="flex justify-between font-mono text-sm">
              <span className="text-muted">{t('bc.totalBet')} <span className="num text-neon">{total}</span></span>
              {error && <span role="alert" className="text-warn">{error}</span>}
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row" aria-live="polite">
            {hand('player')}
            <div className="grid place-items-center font-mono text-sm text-muted">
              {winner ? <span className={`text-lg font-extrabold uppercase ${winner === 'player' ? 'text-cyan' : winner === 'banker' ? 'text-lose' : 'text-win'}`}>{winner === 'tie' ? t('bc.tieWin') : t('bc.wins', { side: t(`bc.${winner}`) })}</span> : revealing ? t('bc.dealing') : t('bc.vs')}
            </div>
            {hand('banker')}
          </div>
          <Roads history={history} />
        </div>
      </Table>
      <ResultToast result={toast} message={toast ? `${toast.outcome.winner === 'tie' ? t('bc.tieWin') : t('bc.wins', { side: t(`bc.${toast.outcome.winner}`) })} ${toast.outcome.playerTotal}–${toast.outcome.bankerTotal}` : undefined} onDismiss={() => setToast(null)} />
    </div>
  )
}
