import { motion, useReducedMotion } from 'framer-motion'
import { Card } from '../../components'
import type { Seat } from '../../engine/holdem'
import { useT, type Key, type T } from '../../i18n'

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
  /** Phone layout: a static list row instead of a seat on the oval. */
  compact?: boolean
}

export function SeatView(props: SeatViewProps) {
  if (props.compact) return <CompactSeat {...props} />
  return <OvalSeat {...props} />
}

const statusLine = ({ seat, thinking, handName, winner }: SeatViewProps, t: T) =>
  thinking ? <span className="text-cyan">{t('he.thinking')}<span className="animate-pulse">…</span></span>
    : handName ? <span className={winner ? 'text-win' : ''}>{t(`hand.${handName}` as Key)}</span>
    : seat.lastAction ? t(`he.act.${seat.lastAction}` as Key) : (seat.style ? <span className={`rounded border px-1 ${STYLE_TAG[seat.style]}`}>{t(`he.style.${seat.style}`)}</span> : '')

const seatLabel = ({ seat, toAct }: SeatViewProps, t: T) =>
  `${seat.human ? t('he.you') : seat.name}${seat.style ? t('he.botSuffix', { s: t(`he.style.${seat.style}`) }) : ''}${t('he.stack', { n: seat.stack })}${seat.folded ? t('he.foldedSuffix') : ''}${toAct ? t('he.toAct') : ''}`

/** Phone seat: one compact row. Bots show mini card backs until showdown; the human gets real cards. */
function CompactSeat(props: SeatViewProps) {
  const { seat, dealer, blind, toAct, reveal, winner, won, handNo } = props
  const t = useT()
  const faceUp = seat.human || reveal
  const out = seat.folded
  return (
    <div data-seat={seat.index} aria-label={seatLabel(props, t)}
      className={`relative min-w-0 rounded-md border bg-surface/95 px-2 py-1.5 ${winner ? 'border-win' : toAct ? 'border-neon shadow-glow-neon' : 'border-border'} ${out ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-1.5">
        <p className="min-w-0 flex-1 truncate font-mono text-[11px] font-semibold text-fg">{seat.human ? t('he.youSeat') : `@${seat.name}`}</p>
        {dealer && <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-fg font-mono text-[9px] font-bold text-bg" title={t('he.dealer')}>D</span>}
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
      <p className="h-4 truncate font-mono text-[10px] text-muted">{statusLine(props, t)}</p>
      {faceUp && seat.hole.length > 0 && (
        <div className="mt-1 flex justify-center gap-1" key={handNo}>
          {seat.hole.map((c, i) => <Card key={i} card={c} size={seat.human ? 'md' : 'sm'} dealIndex={i} highlight={winner && reveal} />)}
        </div>
      )}
    </div>
  )
}

function OvalSeat(props: SeatViewProps) {
  const { seat, pos, dealer, blind, toAct, reveal, winner, won, handNo } = props
  const t = useT()
  const reduce = useReducedMotion()
  const faceUp = seat.human || reveal
  const out = seat.folded
  return (
    <div data-seat={seat.index} className="absolute w-[6.5rem] -translate-x-1/2 -translate-y-1/2 sm:w-36" style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
      aria-label={seatLabel(props, t)}>
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
            {seat.human ? t('he.youSeat') : `@${seat.name}`}
          </p>
          <p className="num text-xs text-neon sm:text-sm">{seat.stack}</p>
          <p className="h-4 truncate font-mono text-[10px] text-muted">{statusLine(props, t)}</p>
        </motion.div>
        {dealer && <span className="absolute -right-2 top-12 grid h-5 w-5 place-items-center rounded-full bg-fg font-mono text-[10px] font-bold text-bg sm:top-16" title={t('he.dealer')}>D</span>}
        {blind && <span className="absolute -left-2 top-12 rounded bg-surface-2 px-1 font-mono text-[9px] text-cyan sm:top-16">{blind}</span>}
        {seat.bet > 0 && <span className="num rounded-full border border-neon/50 bg-bg px-2 text-[11px] text-neon">{seat.bet}</span>}
        {won ? <span className="num rounded-full bg-win px-2 text-[11px] font-bold text-bg">+{won}</span> : null}
      </div>
    </div>
  )
}
