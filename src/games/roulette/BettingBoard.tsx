import { colorOf } from '../../engine/roulette'
import { fmtChips } from '../../components'
import { cellOf, spotKey, type BetMap, type Spot } from './bets'

interface Props {
  bets: BetMap
  onPlace: (s: Spot) => void
  disabled: boolean
  winning: number | null
}

const NUM_BG = { red: 'bg-[#b91c3a]', black: 'bg-surface-2', green: 'bg-[#0f8a4a]' } as const

function Marker({ amount }: { amount?: number }) {
  if (!amount) return null
  return (
    <span className="pointer-events-none absolute -right-1 -top-1 z-10 grid h-6 min-w-6 place-items-center rounded-full border-2 border-neon bg-bg px-1 font-mono text-[10px] font-bold text-neon shadow-glow-neon">
      {fmtChips(amount)}
    </span>
  )
}

/** European betting layout: 0, 1–36 grid, columns, dozens, even-money bets, plus splits between adjacent numbers. */
export function BettingBoard({ bets, onPlace, disabled, winning }: Props) {
  const amt = (s: Spot) => bets[spotKey(s)]?.amount
  const cell = (s: Spot, label: React.ReactNode, cls: string, style?: React.CSSProperties, aria?: string) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPlace(s)}
      style={style}
      aria-label={`${aria ?? String(label)}${amt(s) ? `, ${amt(s)} bet` : ''}`}
      className={`relative grid min-h-10 place-items-center border border-border/80 font-mono text-sm font-semibold text-fg transition-colors hover:bg-neon/20 hover:text-neon disabled:cursor-not-allowed ${cls}`}
    >
      {label}
      <Marker amount={amt(s)} />
    </button>
  )

  const splits: { s: Spot; style: React.CSSProperties }[] = []
  for (let n = 1; n <= 36; n++) {
    const { col, row } = cellOf(n)
    if (n + 3 <= 36) splits.push({ s: { kind: 'split', numbers: [n, n + 3] }, style: { gridColumn: col + 1, gridRow: row + 1, justifySelf: 'end', marginRight: -6 } })
    if ((n - 1) % 3 !== 2) splits.push({ s: { kind: 'split', numbers: [n, n + 1] }, style: { gridColumn: col + 1, gridRow: row + 1, alignSelf: 'start', marginTop: -6 } })
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[640px] grid-cols-[3rem_repeat(12,minmax(0,1fr))_3rem] gap-0.5">
        {cell({ kind: 'straight', number: 0 }, '0', `${NUM_BG.green} ${winning === 0 ? 'ring-2 ring-neon' : ''}`, { gridColumn: 1, gridRow: '1 / span 3' })}
        {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => {
          const { col, row } = cellOf(n)
          return (
            <div key={n} style={{ gridColumn: col + 1, gridRow: row + 1 }} className="relative grid">
              {cell({ kind: 'straight', number: n }, n, `${NUM_BG[colorOf(n)]} ${winning === n ? 'ring-2 ring-neon z-20' : ''}`)}
            </div>
          )
        })}
        {splits.map(({ s, style }) => (
          <button
            key={spotKey(s)}
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => onPlace(s)}
            style={style}
            title={`Split ${(s as { numbers: number[] }).numbers.join('/')}`}
            aria-label={`Split ${(s as { numbers: number[] }).numbers.join(' and ')}`}
            className="relative z-10 h-3 w-3 rounded-full opacity-0 hover:bg-cyan hover:opacity-80 disabled:hidden data-[on=true]:opacity-100"
            data-on={!!amt(s)}
          >
            <Marker amount={amt(s)} />
          </button>
        ))}
        {([3, 2, 1] as const).map((c, r) =>
          <div key={c} style={{ gridColumn: 14, gridRow: r + 1 }} className="grid">
            {cell({ kind: 'column', index: c }, '2:1', 'bg-surface', undefined, `Column ${c}`)}
          </div>)}
        {([1, 2, 3] as const).map((d) =>
          <div key={d} style={{ gridColumn: `${2 + (d - 1) * 4} / span 4`, gridRow: 4 }} className="grid">
            {cell({ kind: 'dozen', index: d }, `${d === 1 ? '1st' : d === 2 ? '2nd' : '3rd'} 12`, 'bg-surface', undefined, `Dozen ${d}`)}
          </div>)}
        {([
          [{ kind: 'low' }, '1–18', 'bg-surface', 'Low 1 to 18'],
          [{ kind: 'even' }, 'EVEN', 'bg-surface', 'Even'],
          [{ kind: 'red' }, '◆', `${NUM_BG.red} text-fg`, 'Red'],
          [{ kind: 'black' }, '◆', NUM_BG.black, 'Black'],
          [{ kind: 'odd' }, 'ODD', 'bg-surface', 'Odd'],
          [{ kind: 'high' }, '19–36', 'bg-surface', 'High 19 to 36'],
        ] as [Spot, string, string, string][]).map(([s, label, cls, aria], i) =>
          <div key={spotKey(s)} style={{ gridColumn: `${2 + i * 2} / span 2`, gridRow: 5 }} className="grid">
            {cell(s, label, cls, undefined, aria)}
          </div>)}
      </div>
    </div>
  )
}
