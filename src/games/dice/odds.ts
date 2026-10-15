import { DICE_MAX_CHANCE, DICE_MIN_CHANCE, diceMultiplier, winChance, type DiceDirection } from '../../engine/dice'
import type { Chips } from '../../engine/types'

/** Valid target range for a direction so the win chance stays within the engine's limits. */
export function targetRange(direction: DiceDirection): { min: number; max: number } {
  return direction === 'under'
    ? { min: DICE_MIN_CHANCE, max: DICE_MAX_CHANCE }
    : { min: Math.round((99.99 - DICE_MAX_CHANCE) * 100) / 100, max: Math.round((99.99 - DICE_MIN_CHANCE) * 100) / 100 }
}

export const clampTarget = (t: number, d: DiceDirection) => {
  const { min, max } = targetRange(d)
  return Math.round(Math.min(max, Math.max(min, t)) * 100) / 100
}

/** Live preview, computed with the engine's own functions. */
export function preview(amount: Chips, target: number, direction: DiceDirection) {
  const chance = winChance(target, direction)
  const multiplier = diceMultiplier(chance)
  return { chance, multiplier, payout: Math.floor(amount * multiplier), profit: Math.floor(amount * multiplier) - amount }
}

/** Switching direction keeps the same win chance by mirroring the target. */
export const mirrorTarget = (t: number, to: DiceDirection) => clampTarget(Math.round((99.99 - t) * 100) / 100, to)
