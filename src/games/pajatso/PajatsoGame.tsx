import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { BetPanel, ResultToast, Table } from '../../components'
import { useWallet } from '../../app/wallet'
import { play } from '../../app/sound'
import { useT } from '../../i18n'
import { errorText } from '../../i18n/errors'
import { PAJATSO_CUPS, pajatsoPaytable, pajatsoRtp, playPajatso, type PajatsoOutcome } from '../../engine'
import type { Chips, RoundResult } from '../../engine/types'
import { COIN_R, CUP_Y, H, PIN_R, W, coinKeyframes, cupX, fmtX, pins } from './geometry'

const HISTORY = 12
const QUICK_S = 0.4
const PINS = pins()
const WOOD = 'linear-gradient(90deg,#5a3418 0%,#8a5428 18%,#a8692f 50%,#8a5428 82%,#5a3418 100%)'
const METAL = 'linear-gradient(180deg,#e9edf0,#9aa3aa 45%,#d5dadd 55%,#7d858b)'

export default function PajatsoGame() {
  const { balance, wallet } = useWallet()
  const reduce = useReducedMotion()
  const t = useT()
  const [bet, setBet] = useState<Chips>(10)
  const [lastBet, setLastBet] = useState<Chips>()
  const [coin, setCoin] = useState<RoundResult<PajatsoOutcome> | null>(null)
  const [landed, setLanded] = useState<RoundResult<PajatsoOutcome> | null>(null)
  const [history, setHistory] = useState<RoundResult<PajatsoOutcome>[]>([])
  const [toast, setToast] = useState<RoundResult<PajatsoOutcome> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef<RoundResult<PajatsoOutcome> | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const falling = coin !== null

  // never strand a debited bet: settle on unmount
  useEffect(() => () => { timers.current.forEach(clearTimeout); if (pending.current) wallet.settle(pending.current) }, [wallet])

  /** Coin is in the cup: only now does the wallet get paid. */
  const land = useCallback(() => {
    const r = pending.current
    if (!r) return
    pending.current = null
    timers.current.forEach(clearTimeout); timers.current = []
    wallet.settle(r)
    play(r.payout > 0 ? 'chip' : 'tick')
    setLanded(r); setCoin(null)
    setHistory((h) => [r, ...h].slice(0, HISTORY))
    setToast(r)
  }, [wallet])

  const start = () => {
    if (falling) return
    let r: RoundResult<PajatsoOutcome>
    try { r = playPajatso(wallet, bet) } catch (e) { setError(errorText(e, t)); return }
    setError(null); setToast(null); setLanded(null); setLastBet(bet)
    pending.current = r
    setCoin(r)
    if (!reduce) {
      const kf = coinKeyframes(r.outcome.path, r.outcome.cup)
      timers.current = kf.pinHits.map((at) => setTimeout(() => play('tick', { volume: 0.4, rate: 1.7 }), at * kf.duration * 1000))
    }
  }

  const kf = coin ? coinKeyframes(coin.outcome.path, coin.outcome.cup) : null
  const lit = landed?.outcome.cup ?? null

  return (
    <div className="space-y-4">
      <Table
        title="pajatso.tsx"
        subtitle={t('pj.subtitle', { rtp: (pajatsoRtp() * 100).toFixed(0) })}
        actions={
          <div className="flex max-w-[55vw] gap-1 overflow-x-auto" aria-label={t('pj.recent')}>
            {history.length === 0 && <span className="font-mono text-xs text-muted">{t('pj.noCoins')}</span>}
            {history.map((h) => (
              <span key={h.roundId} className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${h.payout > 0 ? 'bg-warn text-bg' : 'bg-surface-2 text-muted'}`}>{fmtX(h.outcome.multiplier)}</span>
            ))}
          </div>
        }
        footer={
          <div className="space-y-3">
            <div className="flex justify-end">
              <button type="button" className="btn-primary min-h-11 min-w-36" disabled={falling || bet <= 0 || bet > balance} onClick={start} data-sfx="chip">
                {falling ? t('pj.falling') : t('pj.insert', { n: bet })}
              </button>
            </div>
            <BetPanel balance={balance} bet={bet} onBetChange={setBet} lastBet={lastBet} disabled={falling} />
            {error && <p role="alert" className="text-sm text-warn">{error}</p>}
          </div>
        }
      >
        {/* the cabinet: wood sides, chrome trim, a glass front over the pin field */}
        <div className="mx-auto w-full max-w-md rounded-2xl p-2 shadow-2xl sm:p-3" style={{ background: WOOD }} data-testid="pajatso-cabinet">
          <div className="rounded-lg p-[3px]" style={{ background: METAL }}>
            <div className="rounded-md bg-[#7a1c1c] px-2 py-2 text-center" >
              <div className="font-mono text-lg font-black tracking-[0.3em] text-[#ffd76a] [text-shadow:0_0_8px_#ff9d2e]">PAJATSO</div>
              <dl className="mt-1 flex justify-center gap-3 font-mono text-xs text-[#ffe9b0]" aria-label={t('pj.paytable')}>
                {pajatsoPaytable().map((m) => (
                  <div key={m} className="flex gap-1"><dt className="sr-only">{t('pj.paytable')}</dt><dd className="rounded border border-[#ffd76a]/60 px-1.5">{fmtX(m)}</dd></div>
                ))}
              </dl>
            </div>
          </div>
          <div className="relative mt-2 overflow-hidden rounded-lg border-4 border-[#c9ced2] bg-[#e8e2cf]">
            <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img"
              aria-label={lit !== null ? t('pj.machineResult', { m: fmtX(PAJATSO_CUPS[lit].multiplier) }) : t('pj.machine')}>
              {PINS.map((p, k) => (
                <g key={k}><circle cx={p.x} cy={p.y} r={PIN_R + 0.8} fill="#6b6f73" /><circle cx={p.x - 0.8} cy={p.y - 0.8} r={PIN_R - 1} fill="#f4f6f7" /></g>
              ))}
              {coin && kf && (
                <motion.g key={coin.roundId}
                  initial={{ x: reduce ? cupX(coin.outcome.cup) : kf.x[0], y: reduce ? 0 : kf.y[0], rotate: 0 }}
                  animate={reduce ? { y: CUP_Y + COIN_R } : { x: kf.x, y: kf.y, rotate: kf.rotate }}
                  transition={reduce ? { duration: QUICK_S, ease: 'easeIn' } : { duration: kf.duration, times: kf.times, ease: 'easeInOut' }}
                  onAnimationComplete={land}>
                  <circle r={COIN_R} fill="#d9a520" stroke="#8a6410" strokeWidth={1.5} />
                  <circle r={COIN_R - 3.5} fill="none" stroke="#fff1b8" strokeWidth={1} />
                  <rect x={-1} y={-4} width={2} height={8} fill="#8a6410" />
                </motion.g>
              )}
            </svg>
            {/* 9 cups along the bottom, the payout printed on each; the hit cup lights up */}
            <div className="grid grid-cols-9 gap-px bg-[#3b2a1a] px-px pb-px" aria-label={t('pj.cups')}>
              {PAJATSO_CUPS.map((c, k) => {
                const on = lit === k
                const win = c.multiplier > 0
                return (
                  <motion.div key={k} data-cup={k} data-lit={on || undefined}
                    animate={on && !reduce ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                    transition={{ duration: 0.45 }}
                    className={`grid h-10 place-items-center rounded-b-md font-mono text-[10px] font-bold sm:text-xs ${on ? (win ? 'bg-[#ffd76a] text-[#5a3418] shadow-[0_0_14px_4px_#ffb340]' : 'bg-[#9aa3aa] text-[#2b2b2b] shadow-[0_0_10px_2px_#cfd6db]') : win ? 'bg-[#7a1c1c] text-[#ffe9b0]' : 'bg-[#4a3423] text-[#c8b79a]'}`}>
                    {win ? fmtX(c.multiplier) : '–'}
                  </motion.div>
                )
              })}
            </div>
            {/* glass reflection */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.35)_0%,rgba(255,255,255,0)_28%,rgba(255,255,255,0)_70%,rgba(255,255,255,0.15)_85%,rgba(255,255,255,0)_100%)]" />
          </div>
          <p className="mt-2 rounded bg-black/35 py-1.5 text-center font-mono text-sm text-[#ffe9b0]" aria-live="polite">
            {landed ? (landed.payout > 0 ? t('pj.won', { m: fmtX(landed.outcome.multiplier), n: landed.payout }) : t('pj.lost')) : falling ? t('pj.falling') : t('pj.hint')}
          </p>
        </div>
      </Table>
      <ResultToast result={toast} message={toast ? fmtX(toast.outcome.multiplier) : undefined} onDismiss={() => setToast(null)} />
    </div>
  )
}
