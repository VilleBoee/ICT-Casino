import { cryptoRng, type Rng } from '../../engine/rng'

/** European single-zero wheel order, clockwise starting at 0. */
export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12,
  35, 3, 26,
] as const
export const POCKET_DEG = 360 / WHEEL_ORDER.length

/** Full spin length (s) and the reduced-motion quick spin. */
export const SPIN_S = 16.5
export const QUICK_SPIN_S = 1.5
/** Ball phases, as fractions of the spin: orbits on the rim, spirals in, drops into the pocket, bounces, settles. */
export const BALL_PHASES = { spiralStart: 0.55, drop: 0.84, bounceUp: 0.9, settle: 1 } as const

const mod = (a: number, m = 360) => ((a % m) + m) % m

export const pocketIndex = (n: number) => {
  const i = WHEEL_ORDER.indexOf(n as (typeof WHEEL_ORDER)[number])
  if (i < 0) throw new Error(`Not a roulette number: ${n}`)
  return i
}

/**
 * Next wheel rotation (deg, increasing = clockwise) so that pocket `n` ends under the
 * pointer at 12 o'clock, after at least `turns` full turns from `current`.
 * Pocket i is drawn at angle i*POCKET_DEG, so it's at the top when rotation ≡ -i*POCKET_DEG (mod 360).
 */
export function targetRotation(current: number, n: number, turns = 5): number {
  const want = mod(-pocketIndex(n) * POCKET_DEG)
  const base = current + turns * 360
  return base + mod(want - mod(base))
}

/** Screen angle (deg, 0 = top, clockwise) of pocket `n`'s centre when the wheel is at `rotation`. */
export const pocketScreenAngle = (rotation: number, n: number) => mod(pocketIndex(n) * POCKET_DEG + rotation)

/** Which number sits under a ball at screen angle `ball` when the wheel is at `rotation`. */
export function numberAt(rotation: number, ball: number): number {
  return WHEEL_ORDER[Math.round(mod(ball - rotation) / POCKET_DEG) % WHEEL_ORDER.length]
}

export interface SpinPlan { rotation: number; ball: number }

/**
 * Plan a spin that lands on `n`: the wheel turns clockwise `wheelTurns`+ times and stops at a random angle,
 * the ball orbits counter-clockwise `ballTurns`+ times and ends exactly over the winning pocket.
 */
export function planSpin(curRotation: number, curBall: number, n: number, rng: Rng = cryptoRng, wheelTurns = 6, ballTurns = 14): SpinPlan {
  const rotation = curRotation + wheelTurns * 360 + rng.next() * 360
  const want = pocketScreenAngle(rotation, n)
  const back = mod(curBall - want) // counter-clockwise distance to the pocket
  return { rotation, ball: curBall - ballTurns * 360 - back }
}
