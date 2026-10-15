import type { Chips, RoundResult } from './types'
import { cryptoRng, type Rng } from './rng'
import type { Wallet } from './wallet'

export type PlinkoRows = 8 | 12 | 16
export type PlinkoRisk = 'low' | 'medium' | 'high'
export const PLINKO_ROWS: readonly PlinkoRows[] = [8, 12, 16]
export const PLINKO_RISKS: readonly PlinkoRisk[] = ['low', 'medium', 'high']

/**
 * Standard binomial payout tables (total-return multipliers), slot 0 = far left.
 * Slot k is hit with probability C(rows, k) / 2^rows. Every table is ~99% RTP.
 */
export const PLINKO_TABLES: Record<PlinkoRows, Record<PlinkoRisk, readonly number[]>> = {
  8: {
    low: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
  },
  12: {
    low: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    high: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
  },
  16: {
    low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
    medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
    high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  },
}

export const plinkoMultipliers = (rows: PlinkoRows, risk: PlinkoRisk) => PLINKO_TABLES[rows][risk]

function binom(n: number, k: number): number {
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return r
}

/** Probability of landing in each slot (length rows + 1). */
export const plinkoSlotOdds = (rows: PlinkoRows): number[] =>
  Array.from({ length: rows + 1 }, (_, k) => binom(rows, k) / 2 ** rows)

/** Exact return-to-player of one table. */
export const plinkoRtp = (rows: PlinkoRows, risk: PlinkoRisk): number =>
  plinkoSlotOdds(rows).reduce((s, p, k) => s + p * PLINKO_TABLES[rows][risk][k], 0)

export interface PlinkoBet { amount: Chips; rows: PlinkoRows; risk: PlinkoRisk }

export function validatePlinkoBet(b: PlinkoBet): void {
  if (!Number.isInteger(b.amount) || b.amount <= 0) throw new Error('Bet must be a positive whole number')
  if (!PLINKO_ROWS.includes(b.rows)) throw new Error('Rows must be 8, 12 or 16')
  if (!PLINKO_RISKS.includes(b.risk)) throw new Error('Risk must be low, medium or high')
}

export interface PlinkoOutcome {
  rows: PlinkoRows
  risk: PlinkoRisk
  /** One step per row: 'L' or 'R'. The ball's peg index after row i is the count of R so far. */
  path: ('L' | 'R')[]
  /** Final slot, 0 = far left; equals the number of 'R' steps. */
  slot: number
  multiplier: number
}

/** Debits the bet and drops the ball. Payout is returned; call wallet.settle() after the drop animation. */
export function dropPlinko(wallet: Wallet, bet: PlinkoBet, rng: Rng = cryptoRng): RoundResult<PlinkoOutcome> {
  validatePlinkoBet(bet)
  wallet.debit(bet.amount)
  const path = Array.from({ length: bet.rows }, () => (rng.int(2) === 1 ? 'R' : 'L') as 'L' | 'R')
  const slot = path.filter((s) => s === 'R').length
  const multiplier = PLINKO_TABLES[bet.rows][bet.risk][slot]
  return {
    game: 'plinko', roundId: `${Date.now().toString(36)}-${rng.int(1e9).toString(36)}`,
    stake: bet.amount, payout: Math.floor(bet.amount * multiplier),
    outcome: { rows: bet.rows, risk: bet.risk, path, slot, multiplier },
  }
}
