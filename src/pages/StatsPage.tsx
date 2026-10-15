import { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { balanceSeries, STARTING_BALANCE, type GameId, type HistoryEntry } from '../engine'
import { GAMES } from '../app/games'
import { href } from '../app/router'
import { useHistory } from '../app/useHistory'
import { wallet } from '../app/wallet'
import { RESETS, type ResetKind } from '../app/statsActions'
import { BalanceChart } from './stats/BalanceChart'

const PAGE = 20
const nameOf = (g: GameId) => GAMES.find((x) => x.id === g)?.name ?? g
const pct = (x: number | null) => (x === null ? '—' : `${(x * 100).toFixed(1)}%`)
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`)
const tone = (n: number) => (n > 0 ? 'text-win' : n < 0 ? 'text-lose' : 'text-muted')
const when = (at: number) => new Date(at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

function Card({ label, value, sub, className = '' }: { label: string; value: string; sub?: string; className?: string }) {
  return (
    <div className="panel p-3">
      <div className="font-mono text-xs uppercase tracking-wider text-muted">{label}</div>
      <div className={`num mt-1 text-xl font-semibold ${className}`}>{value}</div>
      {sub && <div className="mt-0.5 truncate text-xs text-muted">{sub}</div>}
    </div>
  )
}

export default function StatsPage() {
  const { entries, summary: s } = useHistory()
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(PAGE)
  const dialog = useRef<HTMLDialogElement>(null)
  const [pending, setPending] = useState<ResetKind>('both')
  const ask = (k: ResetKind) => { setPending(k); dialog.current?.showModal() }
  const confirmReset = () => { RESETS[pending].run(wallet); if (pending !== 'wallet') setShown(PAGE); dialog.current?.close() }
  const what: Record<ResetKind, string> = {
    stats: `All ${entries.length} recorded rounds are deleted. Your balance stays as it is.`,
    wallet: `Your balance goes back to ${STARTING_BALANCE} chips. Your round history is kept.`,
    both: `Your balance goes back to ${STARTING_BALANCE} chips and all ${entries.length} recorded rounds are deleted.`,
  }

  const header = (
    <header className="mb-6 flex flex-wrap items-end gap-3">
      <div>
        <p className="font-mono text-sm text-muted"><a href={href('/')}>~</a>/stats</p>
        <h1>Stats &amp; history</h1>
      </div>
      <div className="ml-auto flex flex-wrap gap-2">
        <button type="button" className="btn-ghost text-lose" disabled={entries.length === 0} onClick={() => ask('stats')}>Reset stats</button>
        <button type="button" className="btn-ghost text-lose" onClick={() => ask('wallet')}>Reset wallet</button>
        <button type="button" className="btn-ghost text-lose" onClick={() => ask('both')}>Reset both</button>
      </div>
    </header>
  )
  const confirm = (
    <dialog ref={dialog} aria-labelledby="reset-title" className="panel m-auto max-w-sm p-5 text-fg backdrop:bg-black/70">
      <h2 id="reset-title" className="text-lg">{RESETS[pending].label}?</h2>
      <p className="mt-2 text-sm text-muted">{what[pending]} This can’t be undone.</p>
      <form method="dialog" className="mt-4 flex justify-end gap-2">
        <button className="btn-ghost" autoFocus>Cancel</button>
        <button type="button" className="btn-primary bg-lose" onClick={confirmReset}>{RESETS[pending].label}</button>
      </form>
    </dialog>
  )

  if (entries.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8">
        {header}
        <div className="panel p-8 text-center">
          <p className="font-mono text-neon">$ history --list<br /><span className="text-muted">0 rounds found</span></p>
          <p className="mt-3 text-muted">Play a few rounds and your stats will show up here.</p>
          <a href={href('/')} className="btn-primary mt-4 inline-flex no-underline">Go to the lobby</a>
        </div>
        {confirm}
      </section>
    )
  }

  const o = s.overall
  const series = balanceSeries(entries, STARTING_BALANCE)
  const recent: HistoryEntry[] = entries.slice(-shown).reverse()
  const streak = s.currentStreak.kind ? `${s.currentStreak.length} ${s.currentStreak.kind}${s.currentStreak.length > 1 ? (s.currentStreak.kind === 'loss' ? 'es' : 's') : ''}` : '—'
  const fade = reduce ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      {header}
      <motion.div {...fade} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card label="Rounds" value={String(o.rounds)} sub={`${o.wins}W · ${o.losses}L · ${o.pushes}P`} />
        <Card label="Wagered" value={String(o.wagered)} />
        <Card label="Net" value={signed(o.net)} className={tone(o.net)} />
        <Card label="RTP" value={pct(o.rtp)} />
        <Card label="Win rate" value={pct(s.winRate)} />
        <Card label="Biggest win" value={s.biggestWin ? signed(s.biggestWin.net) : '—'} className="text-win" sub={s.biggestWin ? nameOf(s.biggestWin.game) : undefined} />
        <Card label="Biggest loss" value={s.biggestLoss ? signed(s.biggestLoss.net) : '—'} className="text-lose" sub={s.biggestLoss ? nameOf(s.biggestLoss.game) : undefined} />
        <Card label="Streak" value={streak} sub={`best ${s.longestWinStreak}W · worst ${s.longestLossStreak}L`} />
        <Card label="Sessions" value={String(s.sessionCount)} />
      </motion.div>

      <div className="panel mt-6 p-4">
        <h2 className="mb-2 font-mono text-sm text-muted">balance</h2>
        <BalanceChart points={series} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="panel overflow-x-auto p-4">
          <h2 className="mb-2 font-mono text-sm text-muted">per game</h2>
          <table className="w-full text-sm">
            <thead className="text-left font-mono text-xs text-muted">
              <tr><th className="py-1">Game</th><th className="text-right">Rounds</th><th className="text-right">Wagered</th><th className="text-right">Net</th><th className="text-right">RTP</th></tr>
            </thead>
            <tbody className="num">
              {GAMES.filter((g) => s.byGame[g.id]).map((g) => {
                const st = s.byGame[g.id]!
                return (
                  <tr key={g.id} className="border-t border-border">
                    <th scope="row" className="py-1.5 text-left font-sans font-normal"><a href={href(`/game/${g.id}`)}>{g.name}</a></th>
                    <td className="text-right">{st.rounds}</td><td className="text-right">{st.wagered}</td>
                    <td className={`text-right ${tone(st.net)}`}>{signed(st.net)}</td><td className="text-right">{pct(st.rtp)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="panel p-4">
          <h2 className="mb-2 font-mono text-sm text-muted">recent rounds <span className="text-xs">(latest first)</span></h2>
          <ol className="divide-y divide-border text-sm">
            {recent.map((e) => (
              <li key={e.roundId} className="flex items-center gap-3 py-1.5">
                <span className="w-28 shrink-0 font-mono text-xs text-muted">{when(e.at)}</span>
                <span className="min-w-0 flex-1 truncate">{nameOf(e.game)}</span>
                <span className="num text-muted">bet {e.stake}</span>
                <span className={`num w-16 text-right ${tone(e.net)}`}>{signed(e.net)}</span>
              </li>
            ))}
          </ol>
          {shown < entries.length && (
            <button type="button" className="btn-ghost mt-3 w-full" onClick={() => setShown((n) => n + PAGE)}>
              Show more ({entries.length - shown} older)
            </button>
          )}
        </div>
      </div>
      {confirm}
    </section>
  )
}
