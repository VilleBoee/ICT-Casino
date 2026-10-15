/** European single-zero wheel order, clockwise starting at 0. */
export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12,
  35, 3, 26,
] as const
export const POCKET_DEG = 360 / WHEEL_ORDER.length

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
  const want = (((-pocketIndex(n) * POCKET_DEG) % 360) + 360) % 360
  const base = current + turns * 360
  const curMod = ((base % 360) + 360) % 360
  return base + ((want - curMod + 360) % 360)
}
