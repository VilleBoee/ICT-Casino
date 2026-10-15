import { motion } from 'framer-motion'
import type { SlotSymbol } from '../../engine/slots'
import { SYMBOL_UI } from './symbols'
import { useT } from '../../i18n'

export interface ReelProps {
  /** Symbols top → bottom; the last 3 are the visible stop. */
  strip: SlotSymbol[]
  spinKey: string
  durationS: number
  animate: boolean
  highlight: (row: number) => boolean
  dim: boolean
  onStop?: () => void
  /** Fires when this reel lands (for the per-reel stop sound). */
  onLand?: () => void
}

/** One reel: a strip that slides down... visually up, ending with its last 3 cells in the window. */
export function Reel({ strip, spinKey, durationS, animate, highlight, dim, onStop, onLand }: ReelProps) {
  const t = useT()
  const k = strip.length
  const end = `-${((k - 3) / k) * 100}%`
  const finalRows = strip.slice(-3)
  return (
    <div className="relative h-full overflow-hidden rounded-md border border-border bg-bg/70"
      aria-label={t('sl.reel', { s: finalRows.map((s) => t(`sl.s.${s}`)).join(', ') })} role="img">
      <motion.div
        key={spinKey}
        className="absolute inset-x-0 top-0"
        style={{ height: `${(k / 3) * 100}%` }}
        initial={animate ? { y: '0%', filter: 'blur(0px)' } : { y: end }}
        animate={animate ? { y: end, filter: ['blur(0px)', 'blur(2px)', 'blur(0px)'] } : { y: end }}
        transition={animate ? { duration: durationS, ease: [0.25, 0.1, 0.2, 1.05] } : { duration: 0 }}
        onAnimationComplete={() => { onLand?.(); onStop?.() }}
      >
        {strip.map((s, i) => {
          const row = i - (k - 3)
          const hl = row >= 0 && highlight(row)
          return (
            <div key={i} className="grid place-items-center" style={{ height: `${100 / k}%` }}>
              <span
                className={`grid aspect-square h-[80%] place-items-center rounded-md font-mono text-3xl font-extrabold transition-all sm:text-4xl ${
                  hl ? 'bg-neon/15 ring-2 ring-neon' : ''
                } ${dim && row >= 0 && !hl ? 'opacity-40' : ''}`}
                style={{ color: SYMBOL_UI[s].color, textShadow: hl ? `0 0 14px ${SYMBOL_UI[s].color}` : undefined }}
                aria-hidden
              >
                {SYMBOL_UI[s].glyph}
              </span>
            </div>
          )
        })}
      </motion.div>
    </div>
  )
}
