import { useEffect, useState } from 'react'
import type { LegalActions, PokerAction } from '../../engine/holdem'
import type { Chips } from '../../engine/types'
import { clampRaise, presetTo } from './layout'
import { useT } from '../../i18n'

export interface ActionBarProps {
  legal: LegalActions
  currentBet: Chips
  pot: Chips
  stack: Chips
  onAct: (a: PokerAction) => void
}

export function ActionBar({ legal, currentBet, pot, stack, onAct }: ActionBarProps) {
  const t = useT()
  const r = legal.raise
  const [to, setTo] = useState(r?.min ?? 0)
  useEffect(() => { if (r) setTo(r.min) }, [r?.min, r?.max]) // eslint-disable-line react-hooks/exhaustive-deps
  const val = r ? clampRaise(r, to) : 0

  return (
    <div className="space-y-3" role="group" aria-label={t('he.yourAction')}>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" disabled={!legal.fold} onClick={() => onAct({ type: 'fold' })}>{t('he.fold')} <kbd className="text-[10px] opacity-60">F</kbd></button>
        {legal.check ? (
          <button type="button" className="btn-secondary" onClick={() => onAct({ type: 'check' })}>{t('he.check')} <kbd className="text-[10px] opacity-60">C</kbd></button>
        ) : (
          <button type="button" className="btn-secondary" disabled={legal.call === 0} onClick={() => onAct({ type: 'call' })}>
            {t('he.call')} <span className="num">{legal.call}</span>{legal.call >= stack && t('he.allinSuffix')} <kbd className="text-[10px] opacity-60">C</kbd>
          </button>
        )}
        {r && (
          <button type="button" className="btn-primary" onClick={() => onAct(val >= r.max ? { type: 'allin' } : { type: r.kind, to: val })}>
            {val >= r.max ? t('he.allin') : r.kind === 'bet' ? t('he.bet') : t('he.raiseTo')} <span className="num">{val}</span> <kbd className="text-[10px] opacity-60">R</kbd>
          </button>
        )}
      </div>
      {r && r.max > r.min && (
        <div className="flex flex-wrap items-center gap-2">
          <input type="range" min={r.min} max={r.max} step={1} value={val} onChange={(e) => setTo(Number(e.target.value))}
            className="min-w-40 flex-1 accent-neon pointer-coarse:h-11" aria-label={t('he.amount', { k: t(`he.k.${r.kind}`) })} aria-valuetext={t('he.chips', { n: val })} />
          <input type="number" min={r.min} max={r.max} value={val} onChange={(e) => setTo(Number(e.target.value))}
            className="num min-h-11 w-24 rounded-md border border-border bg-surface-2 px-2 py-1.5 text-sm text-fg" aria-label={t('he.exact')} />
          <button type="button" className="btn-ghost px-2 text-xs" onClick={() => setTo(r.min)}>{t('he.min')}</button>
          <button type="button" className="btn-ghost px-2 text-xs" onClick={() => setTo(presetTo(r, currentBet, pot, 0.5))}>{t('he.halfPot')}</button>
          <button type="button" className="btn-ghost px-2 text-xs" onClick={() => setTo(presetTo(r, currentBet, pot, 1))}>{t('he.pot')}</button>
          <button type="button" className="btn-ghost px-2 text-xs" onClick={() => setTo(r.max)}>{t('he.allin')}</button>
        </div>
      )}
      <p className="font-mono text-[11px] text-muted">
        {r ? t('he.range', { k: t(`he.k.${r.kind}`), a: r.min, b: r.max }) : t('he.noRaise')}{t('he.keys')}
      </p>
    </div>
  )
}
