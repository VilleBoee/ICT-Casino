import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { BetPanel, Card, ResultToast, Table } from '../../components'
import { useWallet } from '../../app/wallet'
import { BlackjackRound, type Action, type BlackjackOutcome, type BlackjackState, type HandResult } from '../../engine/blackjack'
import { Shoe } from '../../engine/cards'
import type { Chips, RoundResult } from '../../engine/types'
import { totalLabel } from './format'

const FLIP_MS = 500
const DEAL_MS = 380
const ACTIONS: { a: Action; label: string; key: string }[] = [
  { a: 'hit', label: 'Hit', key: 'h' },
  { a: 'stand', label: 'Stand', key: 's' },
  { a: 'double', label: 'Double', key: 'd' },
  { a: 'split', label: 'Split', key: 'p' },
]
const RESULT_STYLE: Record<HandResult, string> = {
  win: 'text-win border-win', blackjack: 'text-neon border-neon', push: 'text-cyan border-cyan', lose: 'text-lose border-lose',
}

/** The engine mutates state in place; React needs a fresh copy per step. */
const snap = (s: BlackjackState): BlackjackState => structuredClone(s)

type Phase = 'betting' | 'player' | 'reveal' | 'settled'

export default function BlackjackGame() {
  const { balance, wallet } = useWallet()
  const reduce = useReducedMotion()
  const shoe = useMemo(() => new Shoe(6), []) // one shoe per table, reused between rounds
  const round = useRef<BlackjackRound | null>(null)
  const pending = useRef<RoundResult<BlackjackOutcome> | null>(null)
  const lastResults = useRef<BlackjackOutcome['results'] | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const [bet, setBet] = useState<Chips>(25)
  const [lastBet, setLastBet] = useState<Chips>()
  const [state, setState] = useState<BlackjackState | null>(null)
  const [phase, setPhase] = useState<Phase>('betting')
  /** Number of dealer cards visible during the reveal (hole card counts once flipped). */
  const [dealerShown, setDealerShown] = useState(1)
  const [toast, setToast] = useState<RoundResult<BlackjackOutcome> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dealId, setDealId] = useState(0)

  const settle = useCallback(() => {
    const r = pending.current
    if (!r) return
    pending.current = null
    wallet.settle(r)
    lastResults.current = r.outcome.results
    setToast(r)
    setPhase('settled')
  }, [wallet])

  // Leaving mid-round: settle a finished round so no payout is lost.
  useEffect(() => () => { clearTimeout(timer.current); if (pending.current) wallet.settle(pending.current) }, [wallet])

  /** Round finished in the engine: flip hole card, deal dealer draws one by one, then settle. */
  const reveal = useCallback((r: BlackjackRound) => {
    pending.current = r.result()
    const s = snap(r.state)
    setState(s)
    setPhase('reveal')
    if (reduce) { setDealerShown(s.dealer.length); settle(); return }
    let shown = 2
    setDealerShown(2)
    const step = () => {
      if (shown < s.dealer.length) { shown++; setDealerShown(shown); timer.current = setTimeout(step, DEAL_MS) }
      else timer.current = setTimeout(settle, DEAL_MS)
    }
    timer.current = setTimeout(step, FLIP_MS)
  }, [reduce, settle])

  const deal = () => {
    if (phase === 'player' || phase === 'reveal') return
    if (shoe.needsShuffle) shoe.reshuffle()
    let r: BlackjackRound
    try { r = new BlackjackRound(wallet, bet, shoe) } catch (e) { setError((e as Error).message); return }
    setError(null); setToast(null); setLastBet(bet); setDealId((d) => d + 1)
    round.current = r
    setDealerShown(1)
    if (r.state.phase === 'done') {
      pending.current = r.result()
      // natural: let the initial deal play, then reveal
      setState(snap({ ...r.state, results: undefined, phase: 'player' }))
      setPhase('reveal')
      timer.current = setTimeout(() => reveal(r), reduce ? 0 : 4 * 120 + 400)
    } else {
      setState(snap(r.state))
      setPhase('player')
    }
  }

  const legal: Action[] = phase === 'player' && round.current ? round.current.legalActions() : []

  const act = useCallback((a: Action) => {
    const r = round.current
    if (!r || phase !== 'player' || !r.legalActions().includes(a)) return
    r.act(a)
    if (r.state.phase === 'done') {
      pending.current = r.result()
      setState(snap({ ...r.state, results: undefined, phase: 'player' }))
      timer.current = setTimeout(() => reveal(r), reduce ? 0 : DEAL_MS)
      setPhase('reveal')
    } else setState(snap(r.state))
  }, [phase, reduce, reveal])

  // Keyboard shortcuts H/S/D/P (ignored while typing in inputs).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement)?.closest('input,textarea')) return
      const hit = ACTIONS.find((x) => x.key === e.key.toLowerCase())
      if (hit) { e.preventDefault(); act(hit.a) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [act])

  const done = phase === 'reveal' || phase === 'settled'
  const dealerCards = state?.dealer.slice(0, done ? Math.max(2, dealerShown) : 2) ?? []
  const holeHidden = !done || dealerShown < 2 || (phase === 'reveal' && !state?.results)
  const showResults = phase === 'settled'

  return (
    <div className="space-y-4">
      <Table
        title="blackjack.tsx"
        subtitle="6 decks · dealer stands soft 17 · blackjack pays 3:2"
        actions={<span className="font-mono text-xs text-muted">keys: H S D P</span>}
        footer={
          phase === 'player' ? (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Actions">
              {ACTIONS.map(({ a, label, key }) => (
                <button key={a} type="button" className={a === 'hit' ? 'btn-primary' : a === 'stand' ? 'btn-secondary' : 'btn-ghost'}
                  disabled={!legal.includes(a)} onClick={() => act(a)} aria-keyshortcuts={key.toUpperCase()}>
                  {label} <kbd className="rounded border border-current/40 px-1 text-[10px] opacity-70">{key.toUpperCase()}</kbd>
                </button>
              ))}
              {state && state.hands.length > 1 && (
                <span className="ml-auto font-mono text-sm text-muted">hand {state.active + 1} / {state.hands.length}</span>
              )}
            </div>
          ) : (
            <BetPanel balance={balance} bet={bet} onBetChange={setBet} lastBet={lastBet} min={1}
              disabled={phase === 'reveal'} onPlace={deal} placeLabel={phase === 'settled' ? 'Deal again' : 'Deal'} />
          )
        }
      >
        <div className="flex min-h-80 flex-col justify-between gap-8" key={dealId}>
          <section aria-label="Dealer" className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-wider text-muted">
              dealer {state && <span className="num ml-2 text-fg">{holeHidden ? totalLabel(state.dealer.slice(0, 1)) : totalLabel(dealerCards)}</span>}
            </p>
            <div className="flex min-h-24 gap-2">
              {dealerCards.map((c, i) => (
                <Card key={i} card={c} faceDown={i === 1 && holeHidden} dealIndex={i < 2 ? i * 2 + 1 : 0} />
              ))}
              {!state && <p className="self-center font-mono text-sm text-muted">// place your bet and deal</p>}
            </div>
          </section>

          {error && <p role="alert" className="font-mono text-sm text-warn">{error}</p>}

          <section aria-label="Your hands" className="flex flex-wrap gap-6">
            {state?.hands.map((h, hi) => {
              const active = phase === 'player' && hi === state.active
              const res = showResults ? toast?.outcome.results[hi] ?? lastResults.current?.[hi] : undefined
              return (
                <div key={hi} aria-current={active || undefined}
                  className={`space-y-2 rounded-lg border p-3 transition-colors ${active ? 'border-neon shadow-glow-neon' : 'border-transparent'} ${phase === 'player' && !active ? 'opacity-60' : ''}`}>
                  <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted">
                    {state.hands.length > 1 ? `hand ${hi + 1}` : 'you'}
                    <span className="num text-sm text-fg">{totalLabel(h.cards)}</span>
                    <span className="num text-neon">· {h.bet}{h.doubled && ' (2×)'}</span>
                    {h.status === 'bust' && <span className="text-lose">bust</span>}
                    {h.status === 'blackjack' && <span className="text-neon">blackjack</span>}
                  </p>
                  <div className="flex gap-2">
                    {h.cards.map((c, i) => (
                      <Card key={i} card={c} dealIndex={hi === 0 && i < 2 && !h.fromSplit ? i * 2 : 0} highlight={res?.result === 'blackjack'} />
                    ))}
                  </div>
                  {res && (
                    <p className={`inline-block rounded border px-2 py-0.5 font-mono text-xs font-bold uppercase ${RESULT_STYLE[res.result]}`}>
                      {res.result} {res.payout - h.bet > 0 ? `+${res.payout - h.bet}` : res.payout - h.bet}
                    </p>
                  )}
                </div>
              )
            })}
          </section>
        </div>
      </Table>
      <ResultToast
        result={toast}
        message={toast && toast.outcome.results.length > 1 ? toast.outcome.results.map((r) => r.result).join(' · ') : toast?.outcome.results[0]?.result === 'blackjack' ? 'Blackjack!' : undefined}
        onDismiss={() => setToast(null)}
      />
    </div>
  )
}
