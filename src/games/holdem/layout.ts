import type { LegalActions } from '../../engine/holdem'
import type { Chips } from '../../engine/types'

/**
 * Seat position on the oval, as % of the table box. Seat 0 (human) sits bottom-centre,
 * the rest go clockwise (the engine's acting order).
 */
export function seatPosition(i: number, n: number, rx = 44, ry = 40): { left: number; top: number } {
  const a = ((90 + (i * 360) / n) * Math.PI) / 180
  return { left: 50 + rx * Math.cos(a), top: 50 + ry * Math.sin(a) }
}

/** Blind seats for a table of n with the given dealer (mirrors the engine). */
export function blindSeats(dealer: number, n: number): { sb: number; bb: number } {
  const sb = n === 2 ? dealer : (dealer + 1) % n
  return { sb, bb: (sb + 1) % n }
}

/** "Raise to" for a pot-fraction preset, clamped to the engine's min/max. */
export function presetTo(raise: NonNullable<LegalActions['raise']>, currentBet: Chips, pot: Chips, frac: number): Chips {
  return Math.max(raise.min, Math.min(raise.max, currentBet + Math.floor(pot * frac)))
}

export const clampRaise = (raise: NonNullable<LegalActions['raise']>, v: number): Chips =>
  Math.max(raise.min, Math.min(raise.max, Math.round(v)))
