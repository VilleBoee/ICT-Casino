import { beadPlate, bigRoad, roadStats, type BaccaratWinner } from '../../engine/baccarat'
import { useT } from '../../i18n'

const BEAD = { player: 'bg-cyan text-bg', banker: 'bg-lose text-bg', tie: 'bg-win text-bg' } as const
const LETTER = { player: 'P', banker: 'B', tie: 'T' } as const
const ROWS = 6

export function Roads({ history }: { history: BaccaratWinner[] }) {
  const t = useT()
  const beads = beadPlate(history, ROWS).slice(-14)
  const road = bigRoad(history).slice(-20)
  const stats = roadStats(history)
  return (
    <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
      <section aria-label={t('bc.beadPlate')} className="space-y-1">
        <h3 className="text-xs text-muted">{t('bc.beadPlateLc')}</h3>
        <div className="flex gap-0.5 rounded border border-border bg-bg/60 p-1" style={{ minHeight: ROWS * 22 + 8 }}>
          {beads.map((col, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              {col.map((w, j) => (
                <span key={j} className={`grid h-5 w-5 place-items-center rounded-full font-mono text-[10px] font-bold ${BEAD[w]}`} title={t(`bc.${w}`)}>{t(`bc.${LETTER[w]}`)}</span>
              ))}
            </div>
          ))}
          {beads.length === 0 && <span className="self-center px-2 font-mono text-xs text-muted">{t('bc.noCoups')}</span>}
        </div>
      </section>
      <section aria-label={t('bc.bigRoad')} className="min-w-0 space-y-1">
        <h3 className="flex gap-3 text-xs text-muted">
          {t('bc.bigRoadLc')}
          <span className="font-normal"><span className="text-cyan">{t('bc.P')} {stats.player}</span> · <span className="text-lose">{t('bc.B')} {stats.banker}</span> · <span className="text-win">{t('bc.T')} {stats.tie}</span></span>
        </h3>
        <div className="flex gap-0.5 overflow-x-auto rounded border border-border bg-bg/60 p-1" style={{ minHeight: ROWS * 22 + 8 }}>
          {road.map((col, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              {col.slice(0, ROWS).map((cell, j) => (
                <span key={j} title={`${t(`bc.${cell.winner}`)}${cell.ties ? t('bc.plusTie', { n: cell.ties }) : ''}`}
                  className={`relative grid h-5 w-5 place-items-center rounded-full border-2 ${cell.winner === 'player' ? 'border-cyan' : 'border-lose'}`}>
                  {cell.ties > 0 && <span className="absolute h-0.5 w-5 -rotate-45 bg-win" />}
                  {cell.ties > 1 && <span className="font-mono text-[8px] text-win">{cell.ties}</span>}
                </span>
              ))}
              {col.length > ROWS && <span className="font-mono text-[9px] text-muted">+{col.length - ROWS}</span>}
            </div>
          ))}
        </div>
      </section>
      <p className="sr-only" aria-live="polite">{history.length ? t('bc.last', { w: t(`bc.${history.at(-1)!}`) }) : ''}</p>
    </div>
  )
}
