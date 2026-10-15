import { colorOf } from '../../engine/roulette'
import { PHONE, useMediaQuery } from '../../app/useMediaQuery'
import { fmtChips } from '../../components'
import { cellOf, insideSpots, spotKey, spotWins, type BetMap, type Spot } from './bets'
import { useT } from '../../i18n'

const INSIDE = insideSpots()

interface Props {
  bets: BetMap
  onPlace: (s: Spot) => void
  disabled: boolean
  winning: number | null
}

const NUM_BG = { red: 'bg-[#b91c3a]', black: 'bg-surface-2', green: 'bg-[#0f8a4a]' } as const

function Marker({ amount, won }: { amount?: number; won?: boolean }) {
  if (!amount) return null
  return (
    <span className={`pointer-events-none absolute -right-1 -top-1 z-10 grid h-6 min-w-6 place-items-center rounded-full border-2 bg-bg px-1 font-mono text-[10px] font-bold ${won ? 'border-win text-win shadow-[0_0_12px_rgb(74_222_128/.7)]' : 'border-neon text-neon shadow-glow-neon'}`}>
      {fmtChips(amount)}
    </span>
  )
}

/** European betting layout: 0, 1–36 grid, columns, dozens, even-money bets, plus every inside bet
 *  (splits, streets, corners, six-lines, zero splits, trios, first four) as hit-spots over the grid. */
export function BettingBoard({ bets, onPlace, disabled, winning }: Props) {
  // Phones (and touch tablets) get the vertical table (0 on top, 12 rows of 3) with 88px rows and 44px inside-bet hit areas
  // (splits sit half a row from corners/streets, so 88px rows keep neighbouring 44px targets from overlapping).
  const t = useT()
  const vertical = useMediaQuery(`${PHONE}, (pointer: coarse) and (max-width: 1023.98px)`)
  /** Grid placement for number n (1–36). */
  const numPos = (n: number): React.CSSProperties => {
    const { col, row } = cellOf(n)
    return vertical ? { gridColumn: 3 - row, gridRow: col + 1 } : { gridColumn: col + 1, gridRow: row + 1 }
  }
  /** Inside-spot position: horizontal fractions (x along streets, y across) rotated for the vertical table. */
  const spotPos = (x: number, y: number): React.CSSProperties =>
    vertical ? { left: `${(1 - y) * 100}%`, top: `${x * 100}%` } : { left: `${x * 100}%`, top: `${y * 100}%` }
  const amt = (s: Spot) => bets[spotKey(s)]?.amount
  const cell = (s: Spot, label: React.ReactNode, cls: string, style?: React.CSSProperties, aria?: string) => (
    <button
      type="button"
      data-sfx="chip"
      disabled={disabled}
      onClick={() => onPlace(s)}
      style={style}
      aria-label={`${aria ?? String(label)}${amt(s) ? t('rl.betSuffix', { n: amt(s)! }) : ''}${winning !== null && amt(s) && spotWins(s, winning) ? t('rl.winner') : ''}`}
      className={`relative ${winning !== null && s.kind !== 'straight' && spotWins(s, winning) ? 'ring-1 ring-inset ring-win/70' : ''} grid ${vertical ? (s.kind === 'straight' && s.number !== 0 ? 'min-h-[88px]' : 'min-h-16') : 'min-h-10'} place-items-center border border-border/80 font-mono text-sm font-semibold text-fg transition-colors hover:bg-neon/20 hover:text-neon disabled:cursor-not-allowed ${cls}`}
    >
      {label}
      <Marker amount={amt(s)} won={winning !== null && spotWins(s, winning)} />
    </button>
  )

  return (
    <div className={vertical ? 'pb-2' : 'overflow-x-auto pb-2'}>
      <div className={`grid gap-0.5 ${vertical ? 'grid-cols-3 px-3' : 'min-w-[640px] grid-cols-[3rem_repeat(12,minmax(0,1fr))_3rem]'}`}>
        {cell({ kind: 'straight', number: 0 }, '0', `${NUM_BG.green} ${winning === 0 ? 'ring-2 ring-neon' : ''}`,
          vertical ? { gridColumn: '1 / span 3', gridRow: 1 } : { gridColumn: 1, gridRow: '1 / span 3' })}
        {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => {
          return (
            <div key={n} style={numPos(n)} className="relative grid">
              {cell({ kind: 'straight', number: n }, n, `${NUM_BG[colorOf(n)]} ${winning === n ? 'ring-2 ring-neon z-20' : ''}`)}
            </div>
          )
        })}
        {/* inside bets (splits, streets, corners, six-lines, zero bets) over the number grid */}
        <div className="pointer-events-none relative" style={vertical ? { gridColumn: '1 / 4', gridRow: '2 / 14' } : { gridColumn: '2 / 14', gridRow: '1 / 4' }}>
          {INSIDE.map(({ spot, x, y, labelKind }) => {
            const label = `${t(`rl.k.${labelKind}`)} ${spot.numbers.join(', ')}`
            const a = amt(spot)
            const won = winning !== null && spotWins(spot, winning)
            return (
              <button
                key={spotKey(spot)}
                type="button"
                data-sfx="chip"
                disabled={disabled}
                onClick={() => onPlace(spot)}
                title={label}
                aria-label={`${label}${a ? t('rl.betSuffix', { n: a }) : ''}${won && a ? t('rl.winner') : ''}`}
                style={spotPos(x, y)}
                className={`group pointer-events-auto absolute z-10 grid ${vertical ? 'h-11 w-11' : 'h-4 w-4'} -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full disabled:cursor-not-allowed ${
                  a || vertical ? '' : 'hover:bg-cyan/80 focus-visible:bg-cyan/80'
                }`}
              >
                {a ? (
                  <span className={`grid h-6 min-w-6 place-items-center rounded-full border-2 bg-bg px-1 font-mono text-[10px] font-bold ${
                    won ? 'border-win text-win shadow-[0_0_12px_rgb(74_222_128/.7)]' : 'border-cyan text-cyan shadow-glow-cyan'
                  }`}>{fmtChips(a)}</span>
                ) : vertical ? (
                  // invisible 44px hit area, small visible marker
                  <span aria-hidden className="h-5 w-5 rounded-full border border-cyan/30 bg-cyan/10 group-hover:bg-cyan/80 group-focus-visible:bg-cyan/80 group-active:bg-cyan/80" />
                ) : null}
              </button>
            )
          })}
        </div>
        {([3, 2, 1] as const).map((c, r) =>
          <div key={c} style={vertical ? { gridColumn: c, gridRow: 14 } : { gridColumn: 14, gridRow: r + 1 }} className="grid">
            {cell({ kind: 'column', index: c }, '2:1', 'bg-surface', undefined, t('rl.column', { n: c }))}
          </div>)}
        {([1, 2, 3] as const).map((d) =>
          <div key={d} style={vertical ? { gridColumn: d, gridRow: 15 } : { gridColumn: `${2 + (d - 1) * 4} / span 4`, gridRow: 4 }} className="grid">
            {cell({ kind: 'dozen', index: d }, t(`rl.d${d}`), 'bg-surface', undefined, t('rl.dozen', { n: d }))}
          </div>)}
        {([
          [{ kind: 'low' }, '1–18', 'bg-surface', t('rl.low')],
          [{ kind: 'even' }, t('rl.EVEN'), 'bg-surface', t('rl.evenBet')],
          [{ kind: 'red' }, '◆', `${NUM_BG.red} text-fg`, t('rl.redBet')],
          [{ kind: 'black' }, '◆', NUM_BG.black, t('rl.blackBet')],
          [{ kind: 'odd' }, t('rl.ODD'), 'bg-surface', t('rl.oddBet')],
          [{ kind: 'high' }, '19–36', 'bg-surface', t('rl.high')],
        ] as [Spot, string, string, string][]).map(([s, label, cls, aria], i) =>
          <div key={spotKey(s)} style={vertical ? { gridColumn: (i % 3) + 1, gridRow: 16 + Math.floor(i / 3) } : { gridColumn: `${2 + i * 2} / span 2`, gridRow: 5 }} className="grid">
            {cell(s, label, cls, undefined, aria)}
          </div>)}
      </div>
    </div>
  )
}
