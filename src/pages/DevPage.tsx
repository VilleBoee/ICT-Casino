import { useState } from 'react'
import { colors, type ColorToken } from '../theme/tokens'
import { BetPanel, Card, ChipStack, ResultToast, Table } from '../components'
import type { Card as EngineCard, Chips, RoundResult } from '../engine/types'

const HAND: EngineCard[] = [
  { rank: 14, suit: 'S' }, { rank: 13, suit: 'H' }, { rank: 10, suit: 'D' }, { rank: 7, suit: 'C' },
]

function ComponentShowcase() {
  const [balance] = useState<Chips>(1000)
  const [bet, setBet] = useState<Chips>(25)
  const [lastBet, setLastBet] = useState<Chips | undefined>()
  const [hidden, setHidden] = useState(true)
  const [dealKey, setDealKey] = useState(0)
  const [result, setResult] = useState<Pick<RoundResult, 'stake' | 'payout' | 'roundId'> | null>(null)
  const toast = (payout: Chips) => setResult({ stake: bet || 10, payout, roundId: crypto.randomUUID() })

  return (
    <section className="space-y-4" aria-labelledby="components">
      <h2 id="components">Components</h2>
      <Table
        title="blackjack.tsx"
        subtitle="6 decks · S17 · 3:2"
        actions={<span className="num text-sm text-neon">{balance}</span>}
        footer={
          <BetPanel
            balance={balance}
            bet={bet}
            onBetChange={setBet}
            lastBet={lastBet}
            onPlace={() => { setLastBet(bet); setDealKey((k) => k + 1); setHidden(true) }}
            placeLabel="Deal"
          />
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-8">
          <div className="space-y-3">
            <p className="font-mono text-xs text-muted">dealer / player</p>
            <div key={dealKey} className="flex gap-2">
              {HAND.map((c, i) => (
                <Card key={i} card={c} dealIndex={i} faceDown={i === 1 && hidden} highlight={i === 0} />
              ))}
            </div>
            <div className="flex gap-2">
              <Card card={{ rank: 2, suit: 'H' }} size="sm" />
              <Card card={{ rank: 11, suit: 'C' }} size="lg" />
            </div>
          </div>
          <ChipStack amount={bet} />
        </div>
      </Table>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-ghost" onClick={() => setHidden((h) => !h)}>Flip hole card</button>
        <button type="button" className="btn-ghost" onClick={() => setDealKey((k) => k + 1)}>Re-deal</button>
        <button type="button" className="btn-primary" onClick={() => toast((bet || 10) * 2)}>Toast: win</button>
        <button type="button" className="btn-ghost" onClick={() => toast(0)}>Toast: lose</button>
        <button type="button" className="btn-secondary" onClick={() => toast(bet || 10)}>Toast: push</button>
      </div>
      <ResultToast result={result} message="Demo round" onDismiss={() => setResult(null)} />
    </section>
  )
}

const swatches: ColorToken[] = ['bg', 'surface', 'surface-2', 'border', 'fg', 'muted', 'neon', 'cyan', 'win', 'lose', 'warn']

/** Developer showcase of theme + shared components, at #/dev. */
export default function DevPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="font-mono text-sm text-muted">
          <span className="text-neon">ville@ict</span>:<span className="text-cyan">~/casino</span>$ npm run theme
        </p>
        <h1>
          ICT<span className="text-neon text-glow">_</span>Casino
        </h1>
        <p className="max-w-prose text-muted">
          Theme preview. Dark, terminal-inspired, professional. Body text is Inter; headings and numbers are JetBrains Mono.
        </p>
      </header>

      <section className="panel space-y-4" aria-labelledby="colors">
        <h2 id="colors">Colours</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {swatches.map((name) => (
            <li key={name} className="space-y-1">
              <div className="h-12 rounded-md border border-border" style={{ background: colors[name] }} />
              <p className="font-mono text-xs text-fg">{name}</p>
              <p className="font-mono text-xs text-muted">{colors[name]}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="panel space-y-3" aria-labelledby="type">
          <h2 id="type">Typography</h2>
          <h3>Heading 3 — Roulette</h3>
          <p>Body text in Inter for readable descriptions and rules.</p>
          <p className="text-muted">Muted secondary text for hints.</p>
          <p className="num text-3xl text-neon text-glow">1 337 chips</p>
          <p className="font-mono text-sm">
            <span className="text-win">+350 WIN</span> · <span className="text-lose">-50 LOSE</span> ·{' '}
            <span className="text-warn">LOW BALANCE</span>
          </p>
        </section>

        <section className="panel space-y-4" aria-labelledby="buttons">
          <h2 id="buttons">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-primary">Spin</button>
            <button type="button" className="btn-secondary">Deal</button>
            <button type="button" className="btn-ghost">Stand</button>
            <button type="button" className="btn-primary" disabled>Disabled</button>
          </div>
          <div className="rounded-md border border-border bg-surface-2 p-4 shadow-glow-cyan">
            <p className="font-mono text-sm text-cyan">// raised surface with cyan glow</p>
          </div>
        </section>
      </div>

      <ComponentShowcase />
    </div>
  )
}


