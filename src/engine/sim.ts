/**
 * Seeded long-run simulations of every game (used by `npm run sim`, not by the app).
 * Edge = (staked - returned) / staked, measured over `rounds` seeded rounds.
 */
import { seededRng, shuffle } from './rng'
import { Wallet } from './wallet'
import { Shoe, newDeck } from './cards'
import { resolve } from './roulette'
import { BlackjackRound, handTotal, cardValue, type Action } from './blackjack'
import { rollSlots, slotsRtp } from './slots'
import { vpPaytable, classifyVp } from './videopoker'
import { dealCoup, baccaratPayout } from './baccarat'
import { crashPointFromSeed, newCrashSeed } from './crash'
import { diceWins, winChance, diceMultiplier } from './dice'
import type { Card } from './types'

export interface SimRow { game: string; bet: string; rounds: number; measured: number; theoretical: number; note?: string }

/** Basic strategy for 6 decks, dealer stands on soft 17, double after split. */
export function bjBasic(cards: Card[], up: number, legal: Action[]): Action {
  const can = (a: Action) => legal.includes(a)
  const dbl = (alt: Action): Action => (can('double') ? 'double' : alt)
  if (legal.length === 1) return legal[0]
  if (cards.length === 2 && can('split')) {
    const v = cardValue(cards[0])
    const splitVs: Record<number, number[]> = { 11: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 8: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 9: [2, 3, 4, 5, 6, 8, 9],
      7: [2, 3, 4, 5, 6, 7], 6: [2, 3, 4, 5, 6], 4: [5, 6], 3: [2, 3, 4, 5, 6, 7], 2: [2, 3, 4, 5, 6, 7] }
    if (splitVs[v]?.includes(up)) return 'split'
  }
  const { total, soft } = handTotal(cards)
  if (soft) {
    if (total >= 19) return 'stand'
    if (total === 18) return up >= 3 && up <= 6 ? dbl('stand') : up <= 8 ? 'stand' : 'hit'
    if (total === 17) return up >= 3 && up <= 6 ? dbl('hit') : 'hit'
    if (total >= 15) return up >= 4 && up <= 6 ? dbl('hit') : 'hit'
    return up >= 5 && up <= 6 ? dbl('hit') : 'hit'
  }
  if (total >= 17) return 'stand'
  if (total >= 13) return up <= 6 ? 'stand' : 'hit'
  if (total === 12) return up >= 4 && up <= 6 ? 'stand' : 'hit'
  if (total === 11) return up <= 10 ? dbl('hit') : 'hit'
  if (total === 10) return up <= 9 ? dbl('hit') : 'hit'
  if (total === 9) return up >= 3 && up <= 6 ? dbl('hit') : 'hit'
  return 'hit'
}

/** Simple Jacks or Better hold strategy (keep made hands/pairs, 4-flushes, else up to 2 high cards). */
export function vpSimpleHolds(hand: Card[]): boolean[] {
  const counts = new Map<number, number>()
  hand.forEach((c) => counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1))
  const made = classifyVp(hand)
  if (['Royal Flush', 'Straight Flush', 'Four of a Kind', 'Full House', 'Flush', 'Straight'].includes(made)) return hand.map(() => true)
  if ([...counts.values()].some((v) => v >= 2)) return hand.map((c) => counts.get(c.rank)! >= 2)
  const suit = (['S', 'H', 'D', 'C'] as const).find((s) => hand.filter((c) => c.suit === s).length === 4)
  if (suit) return hand.map((c) => c.suit === suit)
  const high = hand.filter((c) => c.rank >= 11).sort((x, y) => x.rank - y.rank).slice(0, 2)
  return hand.map((c) => high.includes(c))
}

const memWallet = () => {
  const w = new Wallet({ getItem: () => null, setItem: () => {} }, () => 0)
  w.settle({ game: 'blackjack', stake: 0, payout: 1e15 })
  return w
}

/** Runs every game. `scale` multiplies the default round counts. */
export function runAllSims(seed = 2026, scale = 1): SimRow[] {
  const rows: SimRow[] = []
  const n = (base: number) => Math.max(1000, Math.round(base * scale))
  const row = (game: string, bet: string, rounds: number, staked: number, returned: number, theoretical: number, note?: string) =>
    rows.push({ game, bet, rounds, measured: (staked - returned) / staked, theoretical, note })

  { // roulette
    const rng = seededRng(seed), N = n(1_000_000)
    let ret = 0
    for (let i = 0; i < N; i++) ret += resolve([{ kind: 'red', amount: 1 }], rng.int(37)).bets[0].payout
    row('Roulette', 'red/black', N, N, ret, 1 / 37)
    const rng2 = seededRng(seed + 1)
    let ret2 = 0
    for (let i = 0; i < N; i++) ret2 += resolve([{ kind: 'straight', number: 17, amount: 1 }], rng2.int(37)).bets[0].payout
    row('Roulette', 'straight up', N, N, ret2, 1 / 37)
  }
  { // blackjack
    const w = memWallet(), shoe = new Shoe(6, seededRng(seed)), N = n(300_000)
    let staked = 0, ret = 0
    for (let i = 0; i < N; i++) {
      if (shoe.needsShuffle) shoe.reshuffle()
      const r = new BlackjackRound(w, 100, shoe)
      while (r.state.phase === 'player') r.act(bjBasic(r.hand.cards, cardValue(r.state.dealer[0]), r.legalActions()))
      const res = r.result()
      staked += 100; ret += 100 + res.payout - res.stake // edge per initial bet
    }
    row('Blackjack', 'basic strategy', N, staked, ret, 0.0045, 'theory ≈0.4-0.5% for 6D S17 DAS; per initial bet')
  }
  { // slots
    const rng = seededRng(seed), N = n(1_000_000)
    let ret = 0
    for (let i = 0; i < N; i++) ret += rollSlots(1, rng).payout
    row('Slots', '10 lines', N, N * 10, ret, 1 - slotsRtp())
  }
  { // video poker
    const rng = seededRng(seed), N = n(500_000), pay5 = vpPaytable(5), pay1 = vpPaytable(1)
    let ret5 = 0, ret1 = 0
    for (let i = 0; i < N; i++) {
      const deck = shuffle(newDeck(), rng), hand = deck.slice(0, 5), hold = vpSimpleHolds(hand)
      let k = 5
      const final = classifyVp(hand.map((c, j) => (hold[j] ? c : deck[k++])))
      ret5 += pay5[final]; ret1 += pay1[final]
    }
    const note = 'theory is optimal play; this sim uses a simple hold strategy (~2% worse)'
    row('Video Poker 9/6', '5 coins (max-coin royal)', N, N * 5, ret5, 0.0046, note)
    row('Video Poker 9/6', '1-4 coins', N, N, ret1, 0.0182, note)
  }
  { // baccarat
    const shoe = new Shoe(8, seededRng(seed)), N = n(1_000_000)
    const ret = { player: 0, banker: 0, tie: 0 }
    for (let i = 0; i < N; i++) {
      if (shoe.needsShuffle) shoe.reshuffle()
      const { winner } = dealCoup(shoe)
      for (const s of ['player', 'banker', 'tie'] as const) ret[s] += baccaratPayout(s, 100, winner)
    }
    row('Baccarat', 'banker', N, N * 100, ret.banker, 0.0106)
    row('Baccarat', 'player', N, N * 100, ret.player, 0.0124)
    row('Baccarat', 'tie 8:1', N, N * 100, ret.tie, 0.1436)
  }
  { // crash
    for (const target of [2, 10]) {
      const rng = seededRng(seed + target), N = n(1_000_000)
      let ret = 0
      for (let i = 0; i < N; i++) if (crashPointFromSeed(newCrashSeed(rng)) >= target) ret += Math.floor(100 * target)
      row('Crash', `cash out ${target}x`, N, N * 100, ret, 0.01)
    }
  }
  { // dice
    for (const [target, dir] of [[50, 'under'], [10, 'under']] as const) {
      const rng = seededRng(seed), N = n(1_000_000), bet = 10_000
      const mult = diceMultiplier(winChance(target, dir))
      let ret = 0
      for (let i = 0; i < N; i++) if (diceWins(rng.int(10000) / 100, { target, direction: dir })) ret += Math.floor(bet * mult)
      row('Dice', `${dir} ${target}`, N, N * bet, ret, 0.01)
    }
  }
  rows.push({ game: "Texas Hold'em", bet: 'vs bots', rounds: 0, measured: 0, theoretical: 0, note: 'no rake: chips only move between players' })
  return rows
}

export function formatSimTable(rows: SimRow[]): string {
  const pct = (x: number) => `${(x * 100).toFixed(2)}%`
  const lines = ['| Game | Bet | Rounds | Measured edge | Theoretical edge | Note |', '|---|---|---:|---:|---:|---|']
  for (const r of rows) lines.push(`| ${r.game} | ${r.bet} | ${r.rounds ? r.rounds.toLocaleString('en-US') : '-'} | ${r.rounds ? pct(r.measured) : '-'} | ${pct(r.theoretical)} | ${r.note ?? ''} |`)
  return lines.join('\n')
}
