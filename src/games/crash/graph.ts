import { multiplierAt } from '../../engine/crash'

export const VIEW_W = 600
export const VIEW_H = 300

/** Axis ranges that grow with the round so the curve always fits with some headroom. */
export function scales(tMs: number, m: number) {
  return { xMax: Math.max(8000, tMs * 1.15), yMax: Math.max(2, 1 + (m - 1) * 1.2) }
}

/** SVG coordinates for a (time, multiplier) pair; y=1x sits on the bottom edge. */
export function toXY(tMs: number, m: number, s: { xMax: number; yMax: number }) {
  return { x: (tMs / s.xMax) * VIEW_W, y: VIEW_H - ((m - 1) / (s.yMax - 1)) * VIEW_H }
}

/** Polyline for the engine curve from 0 to tMs (capped at `cap`), sampled `n` times. */
export function curvePoints(tMs: number, cap: number, n = 64): string {
  const end = multiplierAt(tMs)
  const s = scales(tMs, Math.min(end, cap))
  const pts: string[] = []
  for (let i = 0; i <= n; i++) {
    const t = (tMs * i) / n
    const { x, y } = toXY(t, Math.min(multiplierAt(t), cap), s)
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return pts.join(' ')
}

/** Nice gridline values between 1 and yMax. */
export function yTicks(yMax: number): number[] {
  const span = yMax - 1
  const step = span <= 1.5 ? 0.25 : span <= 4 ? 0.5 : span <= 10 ? 2 : span <= 40 ? 10 : 10 ** Math.floor(Math.log10(span))
  const out: number[] = []
  for (let v = 1 + step; v < yMax; v += step) out.push(Math.round(v * 100) / 100)
  return out
}

export const fmtX = (m: number) => `${m.toFixed(2)}x`

/** Parse the auto cash-out input; returns undefined for empty/invalid. */
export function parseAuto(v: string): number | undefined {
  const n = Number(v.replace(',', '.').replace(/x$/i, ''))
  return v.trim() && Number.isFinite(n) && n >= 1.01 ? Math.floor(n * 100) / 100 : undefined
}
