import { useState } from 'react'
import type { Chips } from '../engine/types'
import { Chip, DENOMINATIONS, type Denomination } from './Chip'

export interface BetPanelProps {
  balance: Chips
  bet: Chips
  onBetChange: (bet: Chips) => void
  /** Previous round's bet, enables "Rebet". */
  lastBet?: Chips
  min?: Chips
  max?: Chips
  /** Lock the panel (e.g. during a spin/deal). */
  disabled?: boolean
  onPlace?: () => void
  placeLabel?: string
}

export function BetPanel({
  balance, bet, onBetChange, lastBet, min = 1, max = Infinity, disabled = false, onPlace, placeLabel = 'Place bet',
}: BetPanelProps) {
  const [selected, setSelected] = useState<Denomination>(DENOMINATIONS[1])
  const cap = Math.min(balance, max)
  const canAdd = (d: Chips) => !disabled && bet + d <= cap
  const set = (n: Chips) => onBetChange(Math.max(0, Math.min(cap, Math.floor(n))))
  const tooLow = balance < min

  return (
    <div className="panel space-y-4" aria-label="Bet panel">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-muted">Bet</p>
          <p className="num text-2xl text-neon">{bet}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">Balance</p>
          <p className="num text-lg">{balance - bet}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Chip denomination">
        {DENOMINATIONS.map((d) => (
          <Chip
            key={d}
            value={d}
            size={44}
            selected={selected === d}
            disabled={!canAdd(d)}
            onClick={() => { setSelected(d); set(bet + d) }}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" disabled={disabled || bet === 0} onClick={() => set(0)}>Clear</button>
        <button type="button" className="btn-ghost" disabled={disabled || bet === 0} onClick={() => set(bet / 2)}>½</button>
        <button type="button" className="btn-ghost" disabled={disabled || bet === 0 || bet * 2 > cap} onClick={() => set(bet * 2)}>2×</button>
        <button type="button" className="btn-ghost" disabled={disabled || !lastBet || lastBet > cap} onClick={() => lastBet && set(lastBet)}>Rebet</button>
        <button type="button" className="btn-ghost" disabled={disabled || cap <= 0} onClick={() => set(cap)}>Max</button>
        {onPlace && (
          <button type="button" className="btn-primary ml-auto" disabled={disabled || bet < min || bet > cap} onClick={onPlace}>
            {placeLabel}
          </button>
        )}
      </div>
      {tooLow && <p className="text-sm text-warn" role="status">Balance too low for the minimum bet ({min}).</p>}
    </div>
  )
}
