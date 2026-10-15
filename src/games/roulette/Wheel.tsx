import { motion, useReducedMotion } from 'framer-motion'
import { colorOf } from '../../engine/roulette'
import { BALL_PHASES, POCKET_DEG, WHEEL_ORDER } from './wheelMath'

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
  /** Ball orbit angle (screen space, 0 = top); ends over the winning pocket wherever the wheel stops. */
  ballAngle: number
  spinning: boolean
  durationS: number
  onSettled: () => void
  winning: number | null
}

/**
 * SVG European wheel. Wheel spins clockwise, ball counter-clockwise; both use the same duration so they end together.
 * Under reduced motion it's a quick, simple rotation (no spiral or bounce).
 */
export function Wheel({ rotation, ballAngle, spinning, durationS, onSettled, winning }: WheelProps) {
  const reduce = useReducedMotion()
  const still = { duration: 0 }
  // long ease-out: fast start, slow believable coast to a stop
  const wheelT = !spinning ? still : reduce ? { duration: durationS, ease: 'easeOut' as const } : { duration: durationS, ease: [0.2, 0.62, 0.12, 1] as const }
  // ball sheds speed a little faster than the wheel (friction on the rim), same end time
  const ballT = !spinning ? still : reduce ? wheelT : { duration: durationS, ease: [0.1, 0.72, 0.16, 1] as const }
  const P = BALL_PHASES
  const RIM = C - 150, POCKET = C - (R - 20)
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[320px]">
      <svg viewBox="0 0 320 320" className="h-full w-full" role="img"
        aria-label={winning === null ? 'Roulette wheel' : `Roulette wheel showing ${winning}`}>
        <circle cx={C} cy={C} r={158} fill="#0d1214" stroke="#24303a" strokeWidth={2} />
        <motion.g
          style={{ originX: '50%', originY: '50%' }}
          initial={false}
          animate={{ rotate: rotation }}
          transition={wheelT}
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
        <motion.g style={{ originX: '50%', originY: '50%' }} initial={false} animate={{ rotate: ballAngle }} transition={ballT}>
          {/* invisible full-size circle: makes this group's box the wheel, so it rotates around the wheel centre, not the ball */}
          <circle cx={C} cy={C} r={158} fill="none" stroke="none" pointerEvents="none" />
          <motion.circle
            cx={C}
            initial={false}
            // orbit on the rim, spiral in, drop into the pocket, bounce out once, settle
            animate={{ cy: spinning && !reduce ? [RIM, RIM, POCKET + 2, POCKET - 9, POCKET + 1, POCKET] : POCKET }}
            transition={!spinning || reduce ? still : {
              duration: durationS,
              times: [0, P.spiralStart, P.drop, P.bounceUp, (P.bounceUp + P.settle) / 2 + 0.02, P.settle],
              ease: ['linear', 'easeIn', 'easeOut', 'easeIn', 'easeOut'],
            }}
            r={6} fill="#f5f7fa" stroke="#93a1ad"
          />
        </motion.g>
        {/* pointer */}
        <path d={`M${C - 8} 2 L${C + 8} 2 L${C} 18 Z`} fill="#39ff88" />
      </svg>
    </div>
  )
}
