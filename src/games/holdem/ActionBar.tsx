import { useEffect, useState } from 'react'
import type { LegalActions, PokerAction } from '../../engine/holdem'
import type { Chips } from '../../engine/types'
import { clampRaise, presetTo } from './layout'

export interface ActionBarProps {
  legal: LegalActions
  currentBet: Chips
  pot: Chips
  stack: Chips
  onAct: (a: PokerAction) => void
}

export function ActionBar({ legal, currentBet, pot, stack, onAct }: ActionBarProps) {
  const r = legal.raise
  const [to, setTo] = useState(r?.min ?? 0)
  useEffect(() => { if (r) setTo(r.min) }, [r?.min, r?.max]) // eslint-disable-line react-hooks/exhaustive-deps
  const val = r ? clampRaise(r, to) : 0

  return (
    <div className="space-y-3" role="group" aria-label="Your action">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" disabled={!legal.fold} onClick={() => onAct({ type: 'fold' })}>Fold <kbd className="text-[10px] opacity-60">F</kbd></button>
        {legal.check ? (
          <button type="button" className="btn-secondary" onClick={() => onAct({ type: 'check' })}>Check <kbd className="text-[10px] opacity-60">C</kbd></button>
        ) : (
          <button type="button" className="btn-secondary" disabled={legal.call === 0} onClick={() => onAct({ type: 'call' })}>
            Call <span className="num">{legal.call}</span>{legal.call >= stack && ' (all-in)'} <kbd className="text-[10px] opacity-60">C</kbd>
          </button>
        )}
        {r && (
          <button type="button" className="btn-primary" onClick={() => onAct(val >= r.max ? { type: 'allin' } : { type: r.kind, to: val })}>
            {val >= r.max ? 'All-in' : r.kind === 'bet' ? 'Bet' : 'Raise to'} <span className="num">{val}</span> <kbd className="text-[10px] opacity-60">R</kbd>
          </button>
        )}
      </div>
      {r && r.max > r.min && (
        <div className="flex flex-wrap items-center gap-2">
          <input type="range" min={r.min} max={r.max} step={1} value={val} onChange={(e) => setTo(Number(e.target.value))}
            className="min-w-40 flex-1 accent-[#39ff88]" aria-label={`${r.kind} amount`} aria-valuetext={`${val} chips`} />
          <input type="number" min={r.min} max={r.max} value={val} onChange={(e) => setTo(Number(e.target.value))}
            className="num w-24 rounded-md border border-border bg-surface-2 px-2 py-1.5 text-sm text-fg" aria-label="Exact amount" />
          <button type="button" className="btn-ghost px-2 text-xs" onClick={() => setTo(r.min)}>Min</button>
          <button type="button" className="btn-ghost px-2 text-xs" onClick={() => setTo(presetTo(r, currentBet, pot, 0.5))}>½ pot</button>
          <button type="button" className="btn-ghost px-2 text-xs" onClick={() => setTo(presetTo(r, currentBet, pot, 1))}>Pot</button>
          <button type="button" className="btn-ghost px-2 text-xs" onClick={() => setTo(r.max)}>All-in</button>
        </div>
      )}
      <p className="font-mono text-[11px] text-muted">
        {r ? `${r.kind} range ${r.min}–${r.max}` : 'raising not available'} · keys F / C / R
      </p>
    </div>
  )
}
