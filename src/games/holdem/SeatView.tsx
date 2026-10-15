import { motion, useReducedMotion } from 'framer-motion'
import { Card } from '../../components'
import type { Seat } from '../../engine/holdem'

const STYLE_TAG = { tight: 'text-cyan border-cyan/50', loose: 'text-warn border-warn/50', bluffer: 'text-[#c084fc] border-[#c084fc]/50' } as const

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
  won?: number
  handNo: number
}

export function SeatView({ seat, pos, dealer, blind, toAct, thinking, reveal, winner, handName, won, handNo }: SeatViewProps) {
  const reduce = useReducedMotion()
  const faceUp = seat.human || reveal
  const out = seat.folded
  return (
    <div className="absolute w-[6.5rem] -translate-x-1/2 -translate-y-1/2 sm:w-36" style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
      aria-label={`${seat.name}${seat.style ? `, ${seat.style} bot` : ''}, stack ${seat.stack}${out ? ', folded' : ''}${toAct ? ', to act' : ''}`}>
      <div className="relative flex flex-col items-center gap-1">
        {/* hole cards */}
        <div className={`flex h-14 gap-0.5 sm:h-[4.5rem] ${out ? 'opacity-30' : ''}`} key={handNo}>
          {seat.hole.map((c, i) => (
            <Card key={i} card={c} size="sm" faceDown={!faceUp} dealIndex={seat.index + i * 4} highlight={winner && reveal} />
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
          <p className="h-4 truncate font-mono text-[10px] text-muted">
            {thinking ? <span className="text-cyan">thinking<span className="animate-pulse">…</span></span>
              : handName ? <span className={winner ? 'text-win' : ''}>{handName}</span>
              : seat.lastAction ?? (seat.style ? <span className={`rounded border px-1 ${STYLE_TAG[seat.style]}`}>{seat.style}</span> : '')}
          </p>
        </motion.div>
        {dealer && <span className="absolute -right-2 top-12 grid h-5 w-5 place-items-center rounded-full bg-fg font-mono text-[10px] font-bold text-bg sm:top-16" title="Dealer">D</span>}
        {blind && <span className="absolute -left-2 top-12 rounded bg-surface-2 px-1 font-mono text-[9px] text-cyan sm:top-16">{blind}</span>}
        {seat.bet > 0 && <span className="num rounded-full border border-neon/50 bg-bg px-2 text-[11px] text-neon">{seat.bet}</span>}
        {won ? <span className="num rounded-full bg-win px-2 text-[11px] font-bold text-bg">+{won}</span> : null}
      </div>
    </div>
  )
}
