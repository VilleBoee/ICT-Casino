import type { Chips, RoundResult } from './types'
import { cryptoRng, type Rng } from './rng'
import type { Wallet } from './wallet'

export const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])
export type Color = 'red' | 'black' | 'green'
export const colorOf = (n: number): Color => (n === 0 ? 'green' : RED.has(n) ? 'red' : 'black')

export type RouletteBet =
  | { kind: 'straight'; number: number; amount: Chips }
  | { kind: 'split' | 'street' | 'corner' | 'line'; numbers: number[]; amount: Chips }
  | { kind: 'red' | 'black' | 'odd' | 'even' | 'low' | 'high'; amount: Chips }
  | { kind: 'dozen' | 'column'; index: 1 | 2 | 3; amount: Chips }

/** Profit multiplier ("X to 1"). */
export const PAYOUT: Record<RouletteBet['kind'], number> = {
  straight: 35, split: 17, street: 11, corner: 8, line: 5,
  dozen: 2, column: 2, red: 1, black: 1, odd: 1, even: 1, low: 1, high: 1,
}
const SIZE = { split: 2, street: 3, corner: 4, line: 6 } as const

export function validateBet(b: RouletteBet): void {
  if (!Number.isInteger(b.amount) || b.amount <= 0) throw new Error('Bet must be a positive whole number')
  const ok = (n: number) => Number.isInteger(n) && n >= 0 && n <= 36
  if (b.kind === 'straight' && !ok(b.number)) throw new Error('Invalid number')
  if (b.kind in SIZE) {
    const nums = (b as { numbers: number[] }).numbers
    if (nums.length !== SIZE[b.kind as keyof typeof SIZE] || !nums.every(ok) || new Set(nums).size !== nums.length)
      throw new Error(`Invalid ${b.kind} bet`)
  }
}

export function wins(b: RouletteBet, n: number): boolean {
  switch (b.kind) {
    case 'straight': return b.number === n
    case 'split': case 'street': case 'corner': case 'line': return b.numbers.includes(n)
    case 'red': return colorOf(n) === 'red'
    case 'black': return colorOf(n) === 'black'
    case 'odd': return n !== 0 && n % 2 === 1
    case 'even': return n !== 0 && n % 2 === 0
    case 'low': return n >= 1 && n <= 18
    case 'high': return n >= 19 && n <= 36
    case 'dozen': return n !== 0 && Math.ceil(n / 12) === b.index
    case 'column': return n !== 0 && ((n - 1) % 3) + 1 === b.index
  }
}

export interface RouletteOutcome {
  number: number
  color: Color
  bets: { bet: RouletteBet; won: boolean; payout: Chips }[]
}

/** Pure resolution: total payout includes returned stakes of winning bets. */
export function resolve(bets: RouletteBet[], n: number): RouletteOutcome {
  const res = bets.map((bet) => {
    const won = wins(bet, n)
    return { bet, won, payout: won ? bet.amount * (PAYOUT[bet.kind] + 1) : 0 }
  })
  return { number: n, color: colorOf(n), bets: res }
}

/**
 * Spin contract: validates and deducts the total stake immediately, decides the
 * number before any animation, and returns the payout WITHOUT crediting it.
 * The UI calls wallet.settle(result) when the ball lands.
 */
export function spin(wallet: Wallet, bets: RouletteBet[], rng: Rng = cryptoRng): RoundResult<RouletteOutcome> {
  if (bets.length === 0) throw new Error('Place a bet first')
  bets.forEach(validateBet)
  const stake = bets.reduce((s, b) => s + b.amount, 0)
  wallet.debit(stake)
  const outcome = resolve(bets, rng.int(37))
  return {
    game: 'roulette',
    roundId: `${Date.now().toString(36)}-${rng.int(1e9).toString(36)}`,
    stake,
    payout: outcome.bets.reduce((s, b) => s + b.payout, 0),
    outcome,
  }
}
