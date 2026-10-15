import type { Card, Chips, RoundResult } from './types'
import type { Shoe } from './cards'
import type { Wallet } from './wallet'

export type BaccaratSide = 'player' | 'banker' | 'tie'
export type BaccaratBets = Partial<Record<BaccaratSide, Chips>>
export type BaccaratWinner = BaccaratSide

export const baccaratValue = (c: Card) => (c.rank >= 10 && c.rank <= 13 ? 0 : c.rank === 14 ? 1 : c.rank)
export const baccaratTotal = (cards: readonly Card[]) => cards.reduce((a, c) => a + baccaratValue(c), 0) % 10

/** Banker drawing rule given the banker total and the player's third card (null if the player stood). */
export function bankerDraws(banker: number, playerThird: Card | null): boolean {
  if (playerThird === null) return banker <= 5
  const p = baccaratValue(playerThird)
  switch (banker) {
    case 0: case 1: case 2: return true
    case 3: return p !== 8
    case 4: return p >= 2 && p <= 7
    case 5: return p >= 4 && p <= 7
    case 6: return p === 6 || p === 7
    default: return false
  }
}

export interface BaccaratCoup { player: Card[]; banker: Card[]; playerTotal: number; bankerTotal: number; winner: BaccaratWinner; natural: boolean }

/** Plays one coup from the shoe with full Punto Banco third-card rules. Deal order: P, B, P, B. */
export function dealCoup(shoe: Pick<Shoe, 'draw'>): BaccaratCoup {
  const player = [shoe.draw()], banker = [shoe.draw()]
  player.push(shoe.draw()); banker.push(shoe.draw())
  let pt = baccaratTotal(player), bt = baccaratTotal(banker)
  const natural = pt >= 8 || bt >= 8
  if (!natural) {
    let third: Card | null = null
    if (pt <= 5) { third = shoe.draw(); player.push(third); pt = baccaratTotal(player) }
    if (bankerDraws(bt, third)) { banker.push(shoe.draw()); bt = baccaratTotal(banker) }
  }
  const winner: BaccaratWinner = pt > bt ? 'player' : bt > pt ? 'banker' : 'tie'
  return { player, banker, playerTotal: pt, bankerTotal: bt, winner, natural }
}

/** Total returned for one bet (incl. stake). Player/banker bets push on a tie. */
export function baccaratPayout(side: BaccaratSide, amount: Chips, winner: BaccaratWinner): Chips {
  if (side === 'tie') return winner === 'tie' ? amount * 9 : 0
  if (winner === 'tie') return amount
  if (side !== winner) return 0
  return side === 'player' ? amount * 2 : amount + Math.floor(amount * 0.95)
}

export interface BaccaratOutcome extends BaccaratCoup { bets: { side: BaccaratSide; amount: Chips; payout: Chips }[] }

/** Debits all bets, deals the coup. Payout is returned; call wallet.settle() after the cards are shown. */
export function playBaccarat(wallet: Wallet, bets: BaccaratBets, shoe: Pick<Shoe, 'draw'>): RoundResult<BaccaratOutcome> {
  const entries = (Object.entries(bets) as [BaccaratSide, Chips][]).filter(([, a]) => a !== undefined && a !== 0)
  if (!entries.length) throw new Error('Place a bet')
  for (const [side, a] of entries) {
    if (!['player', 'banker', 'tie'].includes(side)) throw new Error('Invalid bet')
    if (!Number.isInteger(a) || a <= 0) throw new Error('Bet must be a positive whole number')
  }
  const stake = entries.reduce((s, [, a]) => s + a, 0)
  wallet.debit(stake)
  const coup = dealCoup(shoe)
  const res = entries.map(([side, amount]) => ({ side, amount, payout: baccaratPayout(side, amount, coup.winner) }))
  return {
    game: 'baccarat', roundId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    stake, payout: res.reduce((s, r) => s + r.payout, 0), outcome: { ...coup, bets: res },
  }
}

export interface RoadCell { winner: 'player' | 'banker'; ties: number }

/**
 * Roadmap helpers. beadPlate: results in 6-row columns, in order. bigRoad: a new column every time the
 * winner changes; ties are marked on the previous cell (leading ties are kept on the first cell).
 */
export function beadPlate(history: readonly BaccaratWinner[], rows = 6): BaccaratWinner[][] {
  const cols: BaccaratWinner[][] = []
  history.forEach((w, i) => { if (i % rows === 0) cols.push([]); cols[cols.length - 1].push(w) })
  return cols
}

export function bigRoad(history: readonly BaccaratWinner[]): RoadCell[][] {
  const cols: RoadCell[][] = []
  let pendingTies = 0
  for (const w of history) {
    if (w === 'tie') {
      const last = cols.at(-1)?.at(-1)
      if (last) last.ties++
      else pendingTies++
      continue
    }
    const col = cols.at(-1)
    if (col && col[0].winner === w) col.push({ winner: w, ties: 0 })
    else cols.push([{ winner: w, ties: pendingTies }])
    pendingTies = 0
  }
  return cols
}

/** Win counts for a scoreboard. */
export function roadStats(history: readonly BaccaratWinner[]): Record<BaccaratWinner, number> {
  const s = { player: 0, banker: 0, tie: 0 }
  for (const w of history) s[w]++
  return s
}
