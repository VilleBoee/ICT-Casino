import { baccaratTotal, type BaccaratCoup } from '../../engine/baccarat'

export interface RevealStep { side: 'player' | 'banker'; index: number }

/** Punto Banco reveal order: P, B, P, B, then the player's third card, then the banker's. */
export function revealSteps(coup: Pick<BaccaratCoup, 'player' | 'banker'>): RevealStep[] {
  const steps: RevealStep[] = [
    { side: 'player', index: 0 }, { side: 'banker', index: 0 },
    { side: 'player', index: 1 }, { side: 'banker', index: 1 },
  ]
  if (coup.player.length > 2) steps.push({ side: 'player', index: 2 })
  if (coup.banker.length > 2) steps.push({ side: 'banker', index: 2 })
  return steps
}

/** Cards visible after `shown` reveal steps, and their running totals. */
export function visibleAfter(coup: Pick<BaccaratCoup, 'player' | 'banker'>, shown: number) {
  const steps = revealSteps(coup).slice(0, shown)
  const p = steps.filter((s) => s.side === 'player').length
  const b = steps.filter((s) => s.side === 'banker').length
  const player = coup.player.slice(0, p), banker = coup.banker.slice(0, b)
  return { player, banker, playerTotal: player.length ? baccaratTotal(player) : null, bankerTotal: banker.length ? baccaratTotal(banker) : null }
}
