import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'
import { useT } from '../../i18n'

const W = 600, H = 200, PAD = { l: 44, r: 8, t: 10, b: 18 }

/** Terminal-style balance line: plain SVG, no chart lib. */
export function BalanceChart({ points }: { points: { at: number; balance: number }[] }) {
  const reduce = useReducedMotion()
  const t = useT()
  const geo = useMemo(() => {
    const vals = points.map((p) => p.balance)
    let lo = Math.min(...vals), hi = Math.max(...vals)
    if (lo === hi) { lo -= 10; hi += 10 }
    const x = (i: number) => PAD.l + (points.length < 2 ? 0 : (i / (points.length - 1)) * (W - PAD.l - PAD.r))
    const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.balance).toFixed(1)}`).join(' ')
    const ticks = [hi, (hi + lo) / 2, lo].map((v) => ({ v: Math.round(v), y: y(v) }))
    return { d, ticks, last: points.length ? { x: x(points.length - 1), y: y(vals[vals.length - 1]) } : null }
  }, [points])
  const up = points.length > 1 && points[points.length - 1].balance >= points[0].balance
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full font-mono" role="img"
      aria-label={t('stats.chartAria', { n: points.length, a: points[0]?.balance ?? 0, b: points[points.length - 1]?.balance ?? 0 })}>
      {geo.ticks.map((t) => (
        <g key={t.y}>
          <line x1={PAD.l} x2={W - PAD.r} y1={t.y} y2={t.y} stroke="currentColor" className="text-border" strokeDasharray="2 4" />
          <text x={PAD.l - 6} y={t.y + 4} textAnchor="end" fontSize="11" className="fill-muted">{t.v}</text>
        </g>
      ))}
      <text x={PAD.l} y={H - 4} fontSize="11" className="fill-muted">{t('stats.round', { n: 1 })}</text>
      <text x={W - PAD.r} y={H - 4} fontSize="11" textAnchor="end" className="fill-muted">{t('stats.round', { n: points.length })}</text>
      <motion.path d={geo.d} fill="none" strokeWidth="2" strokeLinejoin="round"
        className={up ? 'stroke-neon' : 'stroke-lose'} style={{ filter: 'drop-shadow(0 0 4px currentColor)' }}
        initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.9, ease: 'easeOut' }} />
      {geo.last && <circle cx={geo.last.x} cy={geo.last.y} r="3.5" className={up ? 'fill-neon' : 'fill-lose'} />}
    </svg>
  )
}
