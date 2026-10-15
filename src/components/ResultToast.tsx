import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { play } from '../app/sound'
import type { Chips, RoundResult } from '../engine/types'

export type ResultKind = 'win' | 'lose' | 'push'

/** Derive win/lose/push from the shared RoundResult contract. */
export function resultKind(r: Pick<RoundResult, 'stake' | 'payout'>): ResultKind {
  return r.payout > r.stake ? 'win' : r.payout === r.stake ? 'push' : 'lose'
}

export interface ResultToastProps {
  /** Settled round to show; null hides the toast. */
  result: Pick<RoundResult, 'stake' | 'payout' | 'roundId'> | null
  /** Optional detail, e.g. "17 Red" or "Blackjack!". */
  message?: string
  onDismiss?: () => void
  autoHideMs?: number
  /** Play the win/lose/push sound when a result appears (default true). */
  sound?: boolean
}

const STYLE: Record<ResultKind, { label: string; cls: string }> = {
  win: { label: 'WIN', cls: 'border-win text-win shadow-[0_0_24px_rgb(74_222_128/.35)]' },
  lose: { label: 'LOSE', cls: 'border-lose text-lose' },
  push: { label: 'PUSH', cls: 'border-cyan text-cyan' },
}
const signed = (n: Chips) => (n > 0 ? `+${n}` : String(n))

export function ResultToast({ result, message, onDismiss, autoHideMs = 3000, sound = true }: ResultToastProps) {
  const reduce = useReducedMotion()
  const roundId = result?.roundId
  useEffect(() => {
    if (!result || !sound) return
    const k = resultKind(result)
    play(k === 'win' ? 'win' : k === 'lose' ? 'lose' : 'tick')
  }, [roundId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!result || !onDismiss || autoHideMs <= 0) return
    const t = setTimeout(onDismiss, autoHideMs)
    return () => clearTimeout(t)
  }, [result, onDismiss, autoHideMs])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-40 flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        {result && (() => {
          const kind = resultKind(result)
          const s = STYLE[kind]
          return (
            <motion.div
              key={result.roundId}
              role="status"
              className={`pointer-events-auto flex items-center gap-4 rounded-lg border bg-surface/95 px-5 py-3 backdrop-blur ${s.cls}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
              transition={reduce ? { duration: 0.01 } : { type: 'spring', stiffness: 320, damping: 26 }}
            >
              <span className="font-mono text-lg font-extrabold">{s.label}</span>
              <span className="num text-xl">{signed(result.payout - result.stake)}</span>
              {message && <span className="text-sm text-fg">{message}</span>}
              {onDismiss && (
                <button type="button" className="ml-2 cursor-pointer text-muted hover:text-fg" aria-label="Dismiss" onClick={onDismiss}>✕</button>
              )}
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
