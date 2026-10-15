import type { Chips, RoundResult } from './types'
import { cryptoRng, type Rng } from './rng'
import type { Wallet } from './wallet'

export const DICE_HOUSE_EDGE = 0.01
export const DICE_MIN_CHANCE = 1
export const DICE_MAX_CHANCE = 95
export type DiceDirection = 'over' | 'under'
export interface DiceBet { amount: Chips; target: number; direction: DiceDirection }

/**
 * Rolls are 0.00-99.99 (10 000 equally likely values). "under T" wins if roll < T (chance T%),
 * "over T" wins if roll > T (chance 99.99 - T %).
 */
export function winChance(target: number, direction: DiceDirection): number {
  return Math.round((direction === 'under' ? target : 99.99 - target) * 100) / 100
}

/** Total-return multiplier: 99 / chance, i.e. a 1% edge. Shown rounded to 4 decimals. */
export const diceMultiplier = (chance: number) => Math.floor(((100 - DICE_HOUSE_EDGE * 100) / chance) * 10000) / 10000

export function validateDiceBet(b: DiceBet): void {
  if (!Number.isInteger(b.amount) || b.amount <= 0) throw new Error('Bet must be a positive whole number')
  if (b.direction !== 'over' && b.direction !== 'under') throw new Error('Direction must be over or under')
  if (!Number.isFinite(b.target) || Math.round(b.target * 100) !== b.target * 100) throw new Error('Target has at most 2 decimals')
  const c = winChance(b.target, b.direction)
  if (c < DICE_MIN_CHANCE || c > DICE_MAX_CHANCE) throw new Error(`Win chance must be ${DICE_MIN_CHANCE}-${DICE_MAX_CHANCE}%`)
}

export const diceWins = (roll: number, b: Pick<DiceBet, 'target' | 'direction'>) => (b.direction === 'under' ? roll < b.target : roll > b.target)

export interface DiceOutcome { roll: number; won: boolean; chance: number; multiplier: number; target: number; direction: DiceDirection }

/** Debits the bet, rolls. Payout is returned; call wallet.settle() after the roll animation. */
export function rollDice(wallet: Wallet, bet: DiceBet, rng: Rng = cryptoRng): RoundResult<DiceOutcome> {
  validateDiceBet(bet)
  wallet.debit(bet.amount)
  const roll = rng.int(10000) / 100
  const chance = winChance(bet.target, bet.direction)
  const multiplier = diceMultiplier(chance)
  const won = diceWins(roll, bet)
  return {
    game: 'dice', roundId: `${Date.now().toString(36)}-${rng.int(1e9).toString(36)}`,
    stake: bet.amount, payout: won ? Math.floor(bet.amount * multiplier) : 0,
    outcome: { roll, won, chance, multiplier, target: bet.target, direction: bet.direction },
  }
}
