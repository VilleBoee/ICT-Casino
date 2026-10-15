import { PAJATSO_ROWS } from '../../engine'

/** Machine pin field in SVG units: 9 cups across, a staggered pin lattice above them. */
export const W = 360
export const CUPS = PAJATSO_ROWS + 1
export const DX = W / CUPS
export const DY = DX * 0.95
export const TOP = 30
export const PIN_R = 3
export const COIN_R = 9
export const CUP_Y = TOP + PAJATSO_ROWS * DY + 6
export const H = CUP_Y + 4

/** Coin x before pin row i after `rights` R steps. */
export const coinX = (i: number, rights: number) => W / 2 + (rights - i / 2) * DX
export const cupX = (k: number) => W / 2 + (k - PAJATSO_ROWS / 2) * DX
export const rowY = (i: number) => TOP + i * DY

/** Every pin of the lattice (the coin's path pins are a subset). */
export function pins(): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  for (let i = 0; i < PAJATSO_ROWS; i++) {
    const off = ((i + 1) % 2) * 0.5 // staggered rows, aligned so the path pins are on the lattice
    for (let m = -1; m <= CUPS; m++) {
      const x = (m + off) * DX
      if (x > PIN_R + 2 && x < W - PIN_R - 2) out.push({ x, y: rowY(i) })
    }
  }
  return out
}

export interface CoinKeyframes { x: number[]; y: number[]; rotate: number[]; times: number[]; duration: number; pinHits: number[] }

/** The coin rattles pin to pin (hop up a little after each), spinning, and drops into its cup. */
export function coinKeyframes(path: ('L' | 'R')[], cup: number, secondsPerRow = 0.2): CoinKeyframes {
  const x = [W / 2], y = [TOP - DY], rotate = [0]
  let rights = 0
  path.forEach((s, i) => {
    const cx = coinX(i, rights), cy = rowY(i) - PIN_R - COIN_R + 1
    x.push(cx); y.push(cy); rotate.push((i + 1) * (s === 'R' ? 50 : -50))
    const next = rights + (s === 'R' ? 1 : 0)
    x.push(cx + (coinX(i + 1, next) - cx) * 0.4); y.push(cy - DY * 0.25); rotate.push((i + 1.5) * (s === 'R' ? 50 : -50))
    rights = next
  })
  x.push(cupX(cup)); y.push(CUP_Y + COIN_R); rotate.push(0)
  const n = x.length - 1, rows = path.length
  const times = x.map((_, k) => k === 0 ? 0 : k === n ? 1 : (Math.floor((k - 1) / 2) + 1 + ((k - 1) % 2 ? 0.35 : 0)) / (rows + 1.3))
  return { x, y, rotate, times, duration: (rows + 1.3) * secondsPerRow, pinHits: times.filter((_, k) => k > 0 && k < n && (k - 1) % 2 === 0) }
}

export const fmtX = (m: number) => `${m}×`
