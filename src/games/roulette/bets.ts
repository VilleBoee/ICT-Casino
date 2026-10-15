import type { RouletteBet } from '../../engine/roulette'
import type { Chips } from '../../engine/types'

/** A betting spot on the board, without an amount. */
export type Spot =
  | { kind: 'straight'; number: number }
  | { kind: 'split'; numbers: [number, number] }
  | { kind: 'red' | 'black' | 'odd' | 'even' | 'low' | 'high' }
  | { kind: 'dozen' | 'column'; index: 1 | 2 | 3 }

export const spotKey = (s: Spot): string => {
  switch (s.kind) {
    case 'straight': return `n${s.number}`
    case 'split': return `s${Math.min(...s.numbers)}-${Math.max(...s.numbers)}`
    case 'dozen': case 'column': return `${s.kind}${s.index}`
    default: return s.kind
  }
}

export interface PlacedBet { spot: Spot; amount: Chips }
export type BetMap = Record<string, PlacedBet>

export const totalOf = (m: BetMap) => Object.values(m).reduce((s, b) => s + b.amount, 0)

export function toEngineBets(m: BetMap): RouletteBet[] {
  return Object.values(m).map(({ spot, amount }) =>
    spot.kind === 'split' ? { kind: 'split', numbers: [...spot.numbers], amount } : ({ ...spot, amount } as RouletteBet),
  )
}

/** Board position for numbers 1..36: column 1..12, row 0 (top: 3,6..) .. 2 (bottom: 1,4..). */
export const cellOf = (n: number) => ({ col: Math.ceil(n / 3), row: 2 - ((n - 1) % 3) })
