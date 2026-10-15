import { motion, useReducedMotion } from 'framer-motion'
import { Card } from '../../components'
import type { Seat } from '../../engine/holdem'
import type { Card as CardT } from '../../engine'

const STYLE_TAG = { tight: 'text-cyan border-cyan/50', loose: 'text-warn border-warn/50', bluffer: 'text-[#c084fc] border-[#c084fc]/50' } as const

/** Small lift for cards that make the best hand. */
function Lift({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <div className={`transition-transform duration-200 ${on ? '-translate-y-1' : ''}`}>{children}</div>
}

/** Live "your best hand" pill; pops in when the label changes (no animation under reduced motion). */
export function HandBadge({ label }: { label: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.span key={label} role="status" aria-live="polite" data-testid="best-hand"
      initial={reduce ? false : { opacity: 0, scale: 0.85, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 24 }}
      className="whitespace-nowrap rounded-full border border-neon/60 bg-bg/90 px-2 py-0.5 font-mono text-[11px] font-semibold text-neon shadow-glow-neon">
      {label}
    </motion.span>
  )
}

export interface SeatViewProps {
  seat: Seat
  pos: { left: number; top: number }
  dealer: boolean
  blind: 'SB' | 'BB' | null
  toAct: boolean
  thinking: boolean
  reveal: boolean
  winner: boolean
  handName?: string
  /** Live best-hand label (the human's seat only). */
  badge?: string
  /** Which of this seat's hole cards are part of the best hand (glow + lift). */
  glow?: (c: CardT) => boolean
  won?: number
  handNo: number
  /** Phone layout: a static list row instead of a seat on the oval. */
  compact?: boolean
}

export function SeatView(props: SeatViewProps) {
  if (props.compact) return <CompactSeat {...props} />
  return <OvalSeat {...props} />
}

const statusLine = ({ seat, thinking, handName, winner }: SeatViewProps) =>
  thinking ? <span className="text-cyan">thinking<span className="animate-pulse">…</span></span>
    : handName ? <span className={winner ? 'text-win' : ''}>{handName}</span>
    : seat.lastAction ?? (seat.style ? <span className={`rounded border px-1 ${STYLE_TAG[seat.style]}`}>{seat.style}</span> : '')

const seatLabel = ({ seat, toAct }: SeatViewProps) =>
  `${seat.name}${seat.style ? `, ${seat.style} bot` : ''}, stack ${seat.stack}${seat.folded ? ', folded' : ''}${toAct ? ', to act' : ''}`

/** Phone seat: one compact row. Bots show mini card backs until showdown; the human gets real cards. */
function CompactSeat(props: SeatViewProps) {
  const { seat, dealer, blind, toAct, reveal, winner, won, handNo } = props
  const faceUp = seat.human || reveal
  const out = seat.folded
  return (
    <div data-seat={seat.index} aria-label={seatLabel(props)}
      className={`relative min-w-0 rounded-md border bg-surface/95 px-2 py-1.5 ${winner ? 'border-win' : toAct ? 'border-neon shadow-glow-neon' : 'border-border'} ${out ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-1.5">
        <p className="min-w-0 flex-1 truncate font-mono text-[11px] font-semibold text-fg">{seat.human ? '> you' : `@${seat.name}`}</p>
        {dealer && <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-fg font-mono text-[9px] font-bold text-bg" title="Dealer">D</span>}
        {blind && <span className="shrink-0 rounded bg-surface-2 px-1 font-mono text-[9px] text-cyan">{blind}</span>}
      </div>
      <div className="flex items-center justify-between gap-1">
        <span className="num text-xs text-neon">{seat.stack}</span>
        {!faceUp && seat.hole.length > 0 && (
          <span className="flex gap-0.5" aria-hidden>
            {seat.hole.map((_, i) => <i key={i} className="h-4 w-3 rounded-sm border border-neon/40 bg-surface-2" />)}
          </span>
        )}
        {seat.bet > 0 && <span className="num rounded-full border border-neon/50 bg-bg px-1.5 text-[10px] text-neon">{seat.bet}</span>}
        {won ? <span className="num rounded-full bg-win px-1.5 text-[10px] font-bold text-bg">+{won}</span> : null}
      </div>
      <p className="h-4 truncate font-mono text-[10px] text-muted">{statusLine(props)}</p>
      {props.badge && <div className="mt-1 flex justify-center"><HandBadge label={props.badge} /></div>}
      {faceUp && seat.hole.length > 0 && (
        <div className="mt-1 flex justify-center gap-1" key={handNo}>
          {seat.hole.map((c, i) => <Lift key={i} on={!!props.glow?.(c)}><Card card={c} size={seat.human ? 'md' : 'sm'} dealIndex={i} highlight={(winner && reveal) || !!props.glow?.(c)} /></Lift>)}
        </div>
      )}
    </div>
  )
}

function OvalSeat(props: SeatViewProps) {
  const { seat, pos, dealer, blind, toAct, reveal, winner, won, handNo } = props
  const reduce = useReducedMotion()
  const faceUp = seat.human || reveal
  const out = seat.folded
  return (
    <div data-seat={seat.index} className="absolute w-[6.5rem] -translate-x-1/2 -translate-y-1/2 sm:w-36" style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
      aria-label={seatLabel(props)}>
      <div className="relative flex flex-col items-center gap-1">
        {/* hole cards */}
        <div className={`flex h-14 gap-0.5 sm:h-[4.5rem] ${out ? 'opacity-30' : ''}`} key={handNo}>
          {seat.hole.map((c, i) => (
            <Lift key={i} on={!!props.glow?.(c)}><Card card={c} size="sm" faceDown={!faceUp} dealIndex={seat.index + i * 4} highlight={(winner && reveal) || !!props.glow?.(c)} /></Lift>
          ))}
        </div>
        <motion.div
          animate={toAct && !reduce ? { boxShadow: ['0 0 0 1px rgb(57 255 136 / .4)', '0 0 18px rgb(57 255 136 / .6)', '0 0 0 1px rgb(57 255 136 / .4)'] } : {}}
          transition={{ duration: 1.2, repeat: Infinity }}
          className={`w-full rounded-md border bg-surface/95 px-2 py-1 text-center ${
            winner ? 'border-win' : toAct ? 'border-neon shadow-glow-neon' : 'border-border'
          } ${out ? 'opacity-50' : ''}`}
        >
          <p className="truncate font-mono text-[11px] font-semibold text-fg sm:text-xs">
            {seat.human ? '> you' : `@${seat.name}`}
          </p>
          <p className="num text-xs text-neon sm:text-sm">{seat.stack}</p>
          <p className="h-4 truncate font-mono text-[10px] text-muted">{statusLine(props)}</p>
        </motion.div>
        {dealer && <span className="absolute -right-2 top-12 grid h-5 w-5 place-items-center rounded-full bg-fg font-mono text-[10px] font-bold text-bg sm:top-16" title="Dealer">D</span>}
        {blind && <span className="absolute -left-2 top-12 rounded bg-surface-2 px-1 font-mono text-[9px] text-cyan sm:top-16">{blind}</span>}
        {seat.bet > 0 && <span className="num rounded-full border border-neon/50 bg-bg px-2 text-[11px] text-neon">{seat.bet}</span>}
        {won ? <span className="num rounded-full bg-win px-2 text-[11px] font-bold text-bg">+{won}</span> : null}
        {props.badge && <HandBadge label={props.badge} />}
      </div>
    </div>
  )
}
