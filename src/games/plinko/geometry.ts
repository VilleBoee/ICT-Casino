import type { PlinkoOutcome, PlinkoRows } from '../../engine'

/** Board in SVG units. Row i has i + 3 pegs; there are rows + 1 slots along the bottom. */
export const VIEW_W = 400
export const TOP = 26
export const PEG_R = 3.2
export const BALL_R = 6

export interface Board { rows: PlinkoRows; dx: number; dy: number; height: number; slotY: number; slotH: number }
export function board(rows: PlinkoRows): Board {
  const dx = VIEW_W / (rows + 2)
  const dy = dx * 0.86
  const slotH = Math.max(18, dx * 0.7)
  const slotY = TOP + rows * dy + 4
  return { rows, dx, dy, slotY, slotH, height: slotY + slotH + 6 }
}

/** Peg centre: row i (0-based), peg j (0..i+2). */
export const pegXY = (b: Board, i: number, j: number) => ({ x: VIEW_W / 2 + (j - 1 - i / 2) * b.dx, y: TOP + i * b.dy })
/** Slot k centre x (0 = far left). */
export const slotX = (b: Board, k: number) => VIEW_W / 2 + (k - b.rows / 2) * b.dx

/** Ball x before row i, given the number of R steps taken so far. Lands on peg j = rights + 1 of that row. */
const ballX = (b: Board, i: number, rights: number) => VIEW_W / 2 + (rights - i / 2) * b.dx

export interface Keyframes { x: number[]; y: number[]; times: number[]; duration: number; pegHits: number[] }

/**
 * Peg-by-peg keyframes for the ball: it touches the top of each peg it hits, hops up a little
 * (slight bounce) towards the next one, and finishes in the centre of the slot.
 * `pegHits` = times (0..1) of each peg contact, for tick sounds.
 */
export function ballKeyframes(o: Pick<PlinkoOutcome, 'rows' | 'path' | 'slot'>, secondsPerRow = 0.14): Keyframes {
  const b = board(o.rows)
  const x: number[] = [VIEW_W / 2], y: number[] = [TOP - b.dy * 0.9]
  let rights = 0
  for (let i = 0; i < o.rows; i++) {
    const cx = ballX(b, i, rights), cy = TOP + i * b.dy - PEG_R - BALL_R + 1
    x.push(cx); y.push(cy) // contact
    const next = rights + (o.path[i] === 'R' ? 1 : 0)
    const nx = ballX(b, i + 1, next)
    x.push(cx + (nx - cx) * 0.45); y.push(cy - b.dy * 0.22) // bounce apex
    rights = next
  }
  x.push(slotX(b, o.slot)); y.push(b.slotY + b.slotH / 2)
  // contact frames evenly spaced; apex sits a bit after each contact
  const n = x.length - 1
  const times = x.map((_, k) => {
    if (k === 0) return 0
    if (k === n) return 1
    const row = Math.floor((k - 1) / 2), apex = (k - 1) % 2 === 1
    return (row + 1 + (apex ? 0.35 : 0)) / (o.rows + 1.2)
  })
  const pegHits = times.filter((_, k) => k > 0 && k < n && (k - 1) % 2 === 0)
  return { x, y, times, duration: (o.rows + 1.2) * secondsPerRow, pegHits }
}

/** Slot colour class by multiplier value: hot edges, cold centre. */
export function slotTone(m: number): string {
  if (m >= 10) return 'bg-lose text-bg'
  if (m >= 3) return 'bg-warn text-bg'
  if (m >= 1.5) return 'bg-neon text-bg'
  if (m >= 1) return 'bg-cyan text-bg'
  return 'bg-surface-2 text-muted'
}
export const fmtMult = (m: number) => `${m}×`
