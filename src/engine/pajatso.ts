import type { Chips, RoundResult } from './types'
import { cryptoRng, shuffle, type Rng } from './rng'
import type { Wallet } from './wallet'

/** Rows of pins the coin falls through; there are PAJATSO_ROWS + 1 cups. */
export const PAJATSO_ROWS = 8

export interface PajatsoCup { multiplier: number; weight: number }

/**
 * The machine's cups, left to right (total-return multipliers, 0 = losing cup).
 * Weights are out of 10 000 and decide the result; RTP is exactly 95%.
 */
export const PAJATSO_CUPS: readonly PajatsoCup[] = [
  { multiplier: 5, weight: 400 },
  { multiplier: 0, weight: 1838 },
  { multiplier: 2, weight: 875 },
  { multiplier: 0, weight: 1837 },
  { multiplier: 20, weight: 100 },
  { multiplier: 0, weight: 1837 },
  { multiplier: 2, weight: 875 },
  { multiplier: 0, weight: 1838 },
  { multiplier: 5, weight: 400 },
]

const TOTAL_WEIGHT = PAJATSO_CUPS.reduce((s, c) => s + c.weight, 0)

/** Payout table to print on the machine: distinct winning multipliers, highest first. */
export const pajatsoPaytable = (): number[] =>
  [...new Set(PAJATSO_CUPS.map((c) => c.multiplier).filter((m) => m > 0))].sort((a, b) => b - a)

export const pajatsoRtp = (): number =>
  PAJATSO_CUPS.reduce((s, c) => s + (c.weight / TOTAL_WEIGHT) * c.multiplier, 0)

export interface PajatsoOutcome {
  cup: number
  multiplier: number
  /** One step per pin row, derived from the chosen cup: the number of 'R' steps equals `cup`. */
  path: ('L' | 'R')[]
}

/** A random-looking path through the pins that ends in `cup`. */
export function pajatsoPath(cup: number, rng: Rng = cryptoRng): ('L' | 'R')[] {
  if (!Number.isInteger(cup) || cup < 0 || cup > PAJATSO_ROWS) throw new Error('Bad cup')
  const steps: ('L' | 'R')[] = [...Array(cup).fill('R'), ...Array(PAJATSO_ROWS - cup).fill('L')]
  return shuffle(steps, rng)
}

/** Debits the bet, picks the cup first, then derives the path. Call wallet.settle() after the animation. */
export function playPajatso(wallet: Wallet, amount: Chips, rng: Rng = cryptoRng): RoundResult<PajatsoOutcome> {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('Bet must be a positive whole number')
  wallet.debit(amount)
  let roll = rng.int(TOTAL_WEIGHT)
  let cup = 0
  while (roll >= PAJATSO_CUPS[cup].weight) roll -= PAJATSO_CUPS[cup++].weight
  const multiplier = PAJATSO_CUPS[cup].multiplier
  return {
    game: 'pajatso', roundId: `${Date.now().toString(36)}-${rng.int(1e9).toString(36)}`,
    stake: amount, payout: Math.floor(amount * multiplier),
    outcome: { cup, multiplier, path: pajatsoPath(cup, rng) },
  }
}
