import { motion, useReducedMotion } from 'framer-motion'
import type { Chips } from '../engine/types'

export const DENOMINATIONS = [1, 5, 25, 100, 500, 1000] as const satisfies readonly Chips[]
export type Denomination = (typeof DENOMINATIONS)[number]

const CHIP_COLOR: Record<Denomination, string> = {
  1: '#93a1ad', 5: '#f87171', 25: '#4ade80', 100: '#22d3ee', 500: '#c084fc', 1000: '#fbbf24',
}
export const fmtChips = (n: Chips) => (n >= 1000 ? `${n / 1000}k` : String(n))

export interface ChipProps {
  value: Denomination
  size?: number
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
}

export function Chip({ value, size = 48, selected = false, disabled = false, onClick }: ChipProps) {
  const reduce = useReducedMotion()
  const color = CHIP_COLOR[value]
  const style = {
    width: size, height: size, fontSize: size * 0.28, color,
    background: `repeating-conic-gradient(${color} 0 15deg, #0d1214 15deg 30deg)`,
  }
  const inner = (
    <span className="grid h-[72%] w-[72%] place-items-center rounded-full border-2 bg-surface font-mono font-extrabold" style={{ borderColor: color }}>
      {fmtChips(value)}
    </span>
  )
  const cls = `grid shrink-0 place-items-center rounded-full ${selected ? 'ring-2 ring-neon ring-offset-2 ring-offset-bg' : ''}`
  if (!onClick) return <span className={cls} style={style} aria-label={`${value} chip`}>{inner}</span>
  return (
    <motion.button
      type="button"
      aria-label={`${value} chip`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`${cls} cursor-pointer disabled:cursor-not-allowed disabled:opacity-40`}
      style={style}
      whileHover={reduce || disabled ? undefined : { y: -3 }}
      whileTap={reduce || disabled ? undefined : { scale: 0.92 }}
      animate={{ y: selected && !reduce ? -4 : 0 }}
    >
      {inner}
    </motion.button>
  )
}

/** Greedy split of an amount into chip denominations (largest first). */
export function toChips(amount: Chips): Denomination[] {
  const out: Denomination[] = []
  let rest = Math.max(0, Math.floor(amount))
  for (const d of [...DENOMINATIONS].reverse()) while (rest >= d) { out.push(d); rest -= d }
  return out
}

export interface ChipStackProps { amount: Chips; size?: number; maxVisible?: number }

/** Renders an amount as a vertical stack of chips; new chips drop in. */
export function ChipStack({ amount, size = 40, maxVisible = 10 }: ChipStackProps) {
  const reduce = useReducedMotion()
  const chips = toChips(amount).reverse().slice(-maxVisible)
  const step = size * 0.14
  return (
    <div className="flex flex-col items-center gap-1" aria-label={`${amount} chips`}>
      <div className="relative" style={{ width: size, height: size + step * Math.max(0, chips.length - 1) }}>
        {chips.map((d, i) => (
          <motion.div
            key={`${i}-${d}`}
            className="absolute left-0"
            style={{ bottom: i * step, zIndex: i }}
            initial={reduce ? false : { y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 22, delay: i * 0.03 }}
          >
            <Chip value={d} size={size} />
          </motion.div>
        ))}
      </div>
      <span className="num text-sm text-fg">{amount}</span>
    </div>
  )
}
