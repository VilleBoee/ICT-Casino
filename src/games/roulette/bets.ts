import { wins, type RouletteBet } from '../../engine/roulette'
import type { Chips } from '../../engine/types'

export type InsideKind = 'split' | 'street' | 'corner' | 'line'

/** A betting spot on the board, without an amount. */
export type Spot =
  | { kind: 'straight'; number: number }
  | { kind: InsideKind; numbers: number[] }
  | { kind: 'red' | 'black' | 'odd' | 'even' | 'low' | 'high' }
  | { kind: 'dozen' | 'column'; index: 1 | 2 | 3 }

export const spotKey = (s: Spot): string => {
  switch (s.kind) {
    case 'straight': return `n${s.number}`
    case 'split': case 'street': case 'corner': case 'line':
      return `${s.kind}:${[...s.numbers].sort((a, b) => a - b).join('-')}`
    case 'dozen': case 'column': return `${s.kind}${s.index}`
    default: return s.kind
  }
}

export interface PlacedBet { spot: Spot; amount: Chips }
export type BetMap = Record<string, PlacedBet>

export const totalOf = (m: BetMap) => Object.values(m).reduce((s, b) => s + b.amount, 0)

export function toEngineBet(spot: Spot, amount: Chips): RouletteBet {
  if ('numbers' in spot) return { kind: spot.kind, numbers: [...spot.numbers].sort((a, b) => a - b), amount }
  return { ...spot, amount } as RouletteBet
}
export const toEngineBets = (m: BetMap): RouletteBet[] => Object.values(m).map(({ spot, amount }) => toEngineBet(spot, amount))

/** Does this spot win on `n`? (Uses the engine's rules.) */
export const spotWins = (s: Spot, n: number) => wins(toEngineBet(s, 1), n)

/** Board position for numbers 1..36: column 1..12, row 0 (top: 3,6..) .. 2 (bottom: 1,4..). */
export const cellOf = (n: number) => ({ col: Math.ceil(n / 3), row: 2 - ((n - 1) % 3) })

/**
 * An inside-bet hit-spot drawn over the 1–36 grid. x/y are fractions of the number grid:
 * x=0 is the edge shared with 0, x=1 the column-bet edge; y=0 top (3,6,…), y=1 bottom (1,4,…) edge.
 */
export type InsideLabel = InsideKind | 'trio' | 'firstFour'
/** `label` is English (tests/aria fallback); `labelKind` lets the UI translate it. */
export interface InsideSpot { spot: Spot & { numbers: number[] }; x: number; y: number; label: string; labelKind: InsideLabel }

const LABEL: Record<InsideKind, string> = { split: 'Split', street: 'Street', corner: 'Corner', line: 'Six line' }
const NAMED: Record<string, InsideLabel> = { Trio: 'trio', 'First four': 'firstFour' }
const mk = (kind: InsideKind, numbers: number[], x: number, y: number, name?: string): InsideSpot => ({
  spot: { kind, numbers }, x, y, label: `${name ?? LABEL[kind]} ${numbers.join(', ')}`, labelKind: name ? NAMED[name] : kind,
})

/** Every inside bet except straight-ups, with its position. */
export function insideSpots(): InsideSpot[] {
  const out: InsideSpot[] = []
  for (let n = 1; n <= 36; n++) {
    const { col, row } = cellOf(n)
    const bottomOfStreet = (n - 1) % 3 === 0
    const topOfStreet = n % 3 === 0
    // splits: right neighbour (n+3) and the number above (n+1)
    if (n + 3 <= 36) out.push(mk('split', [n, n + 3], col / 12, (row + 0.5) / 3))
    if (!topOfStreet) out.push(mk('split', [n, n + 1], (col - 0.5) / 12, row / 3))
    // corners at the intersection up-right of n
    if (!topOfStreet && n + 3 <= 36) out.push(mk('corner', [n, n + 1, n + 3, n + 4], col / 12, row / 3))
    if (bottomOfStreet) {
      // street on the outer (bottom) edge, six-line where two streets meet
      out.push(mk('street', [n, n + 1, n + 2], (col - 0.5) / 12, 1))
      if (n + 3 <= 36) out.push(mk('line', [n, n + 1, n + 2, n + 3, n + 4, n + 5], col / 12, 1))
    }
  }
  // along the 0 edge: zero splits, trios, and the first four
  for (const n of [1, 2, 3]) out.push(mk('split', [0, n], 0, (cellOf(n).row + 0.5) / 3))
  out.push(mk('street', [0, 1, 2], 0, 2 / 3, 'Trio'))
  out.push(mk('street', [0, 2, 3], 0, 1 / 3, 'Trio'))
  out.push(mk('corner', [0, 1, 2, 3], 0, 1, 'First four'))
  return out
}
