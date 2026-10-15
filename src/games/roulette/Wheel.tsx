import { motion, useReducedMotion } from 'framer-motion'
import { colorOf } from '../../engine/roulette'
import { POCKET_DEG, WHEEL_ORDER } from './wheel'

const FILL = { red: '#b91c3a', black: '#141b1e', green: '#0f8a4a' } as const
const R = 140
const C = 160

const polar = (deg: number, r: number) => {
  const a = ((deg - 90) * Math.PI) / 180
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const
}
function wedge(i: number, r0: number, r1: number) {
  const a0 = i * POCKET_DEG - POCKET_DEG / 2
  const a1 = a0 + POCKET_DEG
  const [x0, y0] = polar(a0, r1), [x1, y1] = polar(a1, r1)
  const [x2, y2] = polar(a1, r0), [x3, y3] = polar(a0, r0)
  return `M${x0} ${y0} A${r1} ${r1} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 0 0 ${x3} ${y3}Z`
}

export interface WheelProps {
  /** Wheel rotation in degrees; the pocket at the top pointer wins. */
  rotation: number
  /** Ball orbit angle (screen space), ends at 0 (top). */
  ballAngle: number
  spinning: boolean
  durationS: number
  onSettled: () => void
  winning: number | null
}

/** SVG European wheel. Wheel spins clockwise, ball counter-clockwise, both stop at the top pointer. */
export function Wheel({ rotation, ballAngle, spinning, durationS, onSettled, winning }: WheelProps) {
  const reduce = useReducedMotion()
  const t = reduce || !spinning ? { duration: 0 } : { duration: durationS, ease: [0.12, 0.6, 0.15, 1] as const }
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[320px]">
      <svg viewBox="0 0 320 320" className="h-full w-full" role="img"
        aria-label={winning === null ? 'Roulette wheel' : `Roulette wheel showing ${winning}`}>
        <circle cx={C} cy={C} r={158} fill="#0d1214" stroke="#24303a" strokeWidth={2} />
        <motion.g
          style={{ originX: '50%', originY: '50%' }}
          initial={false}
          animate={{ rotate: rotation }}
          transition={t}
          onAnimationComplete={() => spinning && onSettled()}
        >
          {WHEEL_ORDER.map((n, i) => {
            const [tx, ty] = polar(i * POCKET_DEG, R - 14)
            return (
              <g key={n}>
                <path d={wedge(i, R - 30, R)} fill={FILL[colorOf(n)]} stroke="#07090a" strokeWidth={1} />
                <text x={tx} y={ty} fill="#e6edf3" fontSize={10} fontFamily="JetBrains Mono, monospace" fontWeight={700}
                  textAnchor="middle" dominantBaseline="central" transform={`rotate(${i * POCKET_DEG} ${tx} ${ty})`}>
                  {n}
                </text>
              </g>
            )
          })}
          <circle cx={C} cy={C} r={R - 30} fill="#0a0e0f" stroke="#24303a" />
          {Array.from({ length: 8 }, (_, k) => {
            const [x, y] = polar(k * 45, 60)
            return <line key={k} x1={C} y1={C} x2={x} y2={y} stroke="#39ff88" strokeOpacity={0.35} strokeWidth={2} />
          })}
          <circle cx={C} cy={C} r={18} fill="#141b1e" stroke="#39ff88" strokeOpacity={0.6} />
        </motion.g>
        {/* ball orbit */}
        <motion.g style={{ originX: '50%', originY: '50%' }} initial={false} animate={{ rotate: ballAngle }} transition={t}>
          <motion.circle
            cx={C}
            initial={false}
            animate={{ cy: spinning && !reduce ? [C - 150, C - 150, C - (R - 20)] : C - (R - 20) }}
            transition={reduce || !spinning ? { duration: 0 } : { duration: durationS, times: [0, 0.6, 1] }}
            r={6} fill="#f5f7fa" stroke="#93a1ad"
          />
        </motion.g>
        {/* pointer */}
        <path d={`M${C - 8} 2 L${C + 8} 2 L${C} 18 Z`} fill="#39ff88" />
      </svg>
    </div>
  )
}
