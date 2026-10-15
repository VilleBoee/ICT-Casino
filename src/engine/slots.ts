import type { Chips, RoundResult } from './types'
import { cryptoRng, type Rng } from './rng'
import type { Wallet } from './wallet'

export const SLOT_SYMBOLS = ['bug', 'coffee', 'git', 'cloud', 'cpu', 'root'] as const
export type SlotSymbol = (typeof SLOT_SYMBOLS)[number]

/** Relative weight of each symbol on every cell. */
export const SLOT_WEIGHTS: Record<SlotSymbol, number> = { bug: 30, coffee: 25, git: 20, cloud: 12, cpu: 8, root: 5 }
/** Pay per line bet for 3, 4 and 5 in a row from the leftmost reel. */
export const SLOT_PAYTABLE: Record<SlotSymbol, [number, number, number]> = {
  bug: [5, 15, 60], coffee: [8, 25, 100], git: [15, 50, 250],
  cloud: [25, 125, 600], cpu: [40, 250, 1000], root: [100, 750, 5000],
}
export const REELS = 5
export const ROWS = 3
/** Each payline lists the row (0 = top) used on each of the 5 reels. */
export const PAYLINES: readonly (readonly number[])[] = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0],
]

export interface LineWin { line: number; symbol: SlotSymbol; count: 3 | 4 | 5; payout: Chips }
export interface SlotsOutcome {
  /** grid[reel][row] */
  grid: SlotSymbol[][]
  lineBet: Chips
  wins: LineWin[]
}

const TOTAL_WEIGHT = Object.values(SLOT_WEIGHTS).reduce((a, b) => a + b, 0)

export function randomSymbol(rng: Rng): SlotSymbol {
  let r = rng.int(TOTAL_WEIGHT)
  for (const s of SLOT_SYMBOLS) { r -= SLOT_WEIGHTS[s]; if (r < 0) return s }
  return 'bug'
}

/** Pure: evaluates a grid for the given line bet. */
export function evaluateGrid(grid: SlotSymbol[][], lineBet: Chips): LineWin[] {
  const wins: LineWin[] = []
  PAYLINES.forEach((rows, line) => {
    const first = grid[0][rows[0]]
    let count = 1
    while (count < REELS && grid[count][rows[count]] === first) count++
    if (count >= 3) wins.push({ line, symbol: first, count: count as 3 | 4 | 5, payout: SLOT_PAYTABLE[first][count - 3] * lineBet })
  })
  return wins
}

/** Exact theoretical return per line (every cell is independent, so all lines share it). */
export function slotsRtp(): number {
  let ev = 0
  for (const s of SLOT_SYMBOLS) {
    const p = SLOT_WEIGHTS[s] / TOTAL_WEIGHT
    const [a, b, c] = SLOT_PAYTABLE[s]
    ev += a * p ** 3 * (1 - p) + b * p ** 4 * (1 - p) + c * p ** 5
  }
  return ev
}

/** Pure: rolls a grid and evaluates it (no wallet). */
export function rollSlots(lineBet: Chips, rng: Rng = cryptoRng): { outcome: SlotsOutcome; payout: Chips } {
  const grid = Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => randomSymbol(rng)))
  const wins = evaluateGrid(grid, lineBet)
  return { outcome: { grid, lineBet, wins }, payout: wins.reduce((a, w) => a + w.payout, 0) }
}

/** Debits lineBet * 10 and decides the grid. Payout is returned; call wallet.settle() after the reels stop. */
export function spinSlots(wallet: Wallet, lineBet: Chips, rng: Rng = cryptoRng): RoundResult<SlotsOutcome> {
  if (!Number.isInteger(lineBet) || lineBet <= 0) throw new Error('Line bet must be a positive whole number')
  const stake = lineBet * PAYLINES.length
  wallet.debit(stake)
  const { outcome, payout } = rollSlots(lineBet, rng)
  return { game: 'slots', roundId: `${Date.now().toString(36)}-${rng.int(1e9).toString(36)}`, stake, payout, outcome }
}
