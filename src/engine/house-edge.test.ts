/**
 * House-edge sanity checks (#32). Exact enumeration where the game allows it, otherwise seeded
 * Monte Carlo with tolerances of roughly 3-4 standard errors.
 */
import { describe, it, expect } from 'vitest'
import { resolve, type RouletteBet } from './roulette'
import { BlackjackRound, handTotal, cardValue } from './blackjack'
import { Shoe } from './cards'
import { Wallet } from './wallet'
import { seededRng, shuffle } from './rng'
import { slotsRtp, rollSlots } from './slots'
import { classifyVp, vpPaytable, VP_MAX_COINS } from './videopoker'

const VP5 = vpPaytable(VP_MAX_COINS)
const vpPerCoin = (hand: keyof typeof VP5) => VP5[hand] / VP_MAX_COINS
import { newDeck } from './cards'
import { dealCoup, baccaratPayout, type BaccaratSide } from './baccarat'
import { crashPointFromSeed, newCrashSeed, crashPointFromUniform } from './crash'
import { diceWins, winChance, diceMultiplier } from './dice'
import type { Card, Rank } from './types'

const richWallet = () => {
  const w = new Wallet({ getItem: () => null, setItem: () => {} }, () => 0)
  w.settle({ game: 'blackjack', stake: 0, payout: 1e12 })
  return w
}

describe('house edge: roulette (exact)', () => {
  const bets: RouletteBet[] = [
    { kind: 'straight', number: 17, amount: 1 }, { kind: 'split', numbers: [1, 2], amount: 1 },
    { kind: 'street', numbers: [1, 2, 3], amount: 1 }, { kind: 'corner', numbers: [1, 2, 4, 5], amount: 1 },
    { kind: 'line', numbers: [1, 2, 3, 4, 5, 6], amount: 1 }, { kind: 'dozen', index: 2, amount: 1 },
    { kind: 'column', index: 3, amount: 1 }, { kind: 'red', amount: 1 }, { kind: 'odd', amount: 1 }, { kind: 'high', amount: 1 },
  ]
  it.each(bets.map((b) => [b.kind, b] as const))('%s returns exactly 36/37', (_k, bet) => {
    let ret = 0
    for (let n = 0; n <= 36; n++) ret += resolve([bet], n).bets[0].payout
    expect(ret / 37).toBeCloseTo(36 / 37, 12)
  })
})

describe('house edge: blackjack (Monte Carlo, basic strategy)', () => {
  type A = 'hit' | 'stand' | 'double' | 'split'
  const basic = (cards: Card[], up: number, legal: A[]): A => {
    const can = (a: A) => legal.includes(a)
    const dbl = (alt: A): A => (can('double') ? 'double' : alt)
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
  it('edge is small (about 0.5%) with basic strategy', () => {
    const w = richWallet()
    const shoe = new Shoe(6, seededRng(14))
    const N = 100_000
    let net = 0
    for (let i = 0; i < N; i++) {
      if (shoe.needsShuffle) shoe.reshuffle()
      const r = new BlackjackRound(w, 100, shoe)
      while (r.state.phase === 'player') r.act(basic(r.hand.cards, cardValue(r.state.dealer[0]), r.legalActions() as A[]))
      const res = r.result()
      net += res.payout - res.stake
    }
    const edge = -net / (N * 100)
    expect(edge).toBeGreaterThan(-0.01)
    expect(edge).toBeLessThan(0.02)
  })
})

describe('house edge: slots', () => {
  it('exact RTP is 95-97% and Monte Carlo agrees', () => {
    const rtp = slotsRtp()
    expect(rtp).toBeGreaterThan(0.95); expect(rtp).toBeLessThan(0.97)
    const rng = seededRng(32)
    let paid = 0
    const N = 200_000
    for (let i = 0; i < N; i++) paid += rollSlots(1, rng).payout
    expect(Math.abs(paid / (N * 10) - rtp)).toBeLessThan(0.02)
  })
})

describe('house edge: video poker 9/6', () => {
  it('exact enumeration of all 2 598 960 deals matches the textbook hand counts', () => {
    const deck = newDeck()
    const counts: Record<string, number> = {}
    let ret = 0
    for (let a = 0; a < 48; a++) for (let b = a + 1; b < 49; b++) for (let c = b + 1; c < 50; c++)
      for (let d = c + 1; d < 51; d++) for (let e = d + 1; e < 52; e++) {
        const hand = classifyVp([deck[a], deck[b], deck[c], deck[d], deck[e]])
        counts[hand] = (counts[hand] ?? 0) + 1
        ret += vpPerCoin(hand)
      }
    expect(counts).toEqual({
      'Royal Flush': 4, 'Straight Flush': 36, 'Four of a Kind': 624, 'Full House': 3744, Flush: 5108, Straight: 10200,
      'Three of a Kind': 54912, 'Two Pair': 123552, 'Jacks or Better': 337920, Nothing: 2598960 - 536100,
    })
    expect(ret / 2598960).toBeCloseTo(0.3369, 3) // return if you never draw
  }, 60_000)
  it('optimal-play hand frequencies give 99.54% at 5 coins and 98.18% at 1-4 coins', () => {
    // Published optimal-strategy final-hand probabilities for 9/6 Jacks or Better (Wizard of Odds).
    const p: Record<string, number> = {
      'Royal Flush': 0.0000247609, 'Straight Flush': 0.0001093643, 'Four of a Kind': 0.0023625417, 'Full House': 0.0115122423,
      Flush: 0.0110145761, Straight: 0.0112293672, 'Three of a Kind': 0.0744486986, 'Two Pair': 0.1292789268,
      'Jacks or Better': 0.2145850066, Nothing: 0.5454340155,
    }
    expect(Object.values(p).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5)
    const rtp = (coins: number) => Object.entries(vpPaytable(coins)).reduce((a, [h, pay]) => a + p[h] * pay, 0) / coins
    expect(rtp(5)).toBeCloseTo(0.9954, 4)
    for (const c of [1, 2, 3, 4]) expect(rtp(c)).toBeCloseTo(0.9818, 4)
  })
  it('a simple hold strategy returns 93-100% (optimal play is 99.54%)', () => {
    const rng = seededRng(21)
    const N = 150_000
    let ret = 0
    for (let i = 0; i < N; i++) {
      const deck = shuffle(newDeck(), rng)
      const hand = deck.slice(0, 5)
      const counts = new Map<number, number>()
      hand.forEach((c) => counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1))
      const made = classifyVp(hand)
      let hold: boolean[]
      if (['Royal Flush', 'Straight Flush', 'Four of a Kind', 'Full House', 'Flush', 'Straight'].includes(made)) hold = hand.map(() => true)
      else if ([...counts.values()].some((v) => v >= 2)) hold = hand.map((c) => counts.get(c.rank)! >= 2)
      else {
        const suit = (['S', 'H', 'D', 'C'] as const).find((s) => hand.filter((c) => c.suit === s).length === 4)
        if (suit) hold = hand.map((c) => c.suit === suit)
        else {
          const high = hand.filter((c) => c.rank >= 11).sort((x, y) => x.rank - y.rank).slice(0, 2)
          hold = hand.map((c) => high.includes(c))
        }
      }
      let k = 5
      const final = hand.map((c, j) => (hold[j] ? c : deck[k++]))
      ret += vpPerCoin(classifyVp(final))
    }
    const rtp = ret / N
    expect(rtp).toBeGreaterThan(0.93)
    expect(rtp).toBeLessThan(1.0)
  })
})

describe('house edge: baccarat (exact, infinite deck)', () => {
  it('banker ~1.06%, player ~1.24%, tie ~14.4%', () => {
    // Enumerate the 6 card values that can be dealt; value 0 (10/J/Q/K) has weight 4/13.
    const rankOf = (v: number): Rank => (v === 0 ? 10 : v === 1 ? 14 : v) as Rank
    const wt = (v: number) => (v === 0 ? 4 : 1) / 13
    const ev: Record<BaccaratSide, number> = { player: 0, banker: 0, tie: 0 }
    const seq = [0, 0, 0, 0, 0, 0]
    const rec = (depth: number, p: number) => {
      if (depth === 6) {
        let i = 0
        const coup = dealCoup({ draw: () => ({ rank: rankOf(seq[i++]), suit: 'S' }) })
        const used = i
        // only weight by cards actually drawn: sum over unused positions is 1, so divide them out
        if (used < 6 && seq.slice(used).some((v) => v !== 0)) return // count each prefix once (unused cards fixed to 0)
        const pp = seq.slice(0, used).reduce((a, v) => a * wt(v), 1)
        for (const side of ['player', 'banker', 'tie'] as const) ev[side] += pp * (baccaratPayout(side, 100, coup.winner) / 100 - 1)
        return
      }
      for (let v = 0; v <= 9; v++) { seq[depth] = v; rec(depth + 1, p * wt(v)) }
    }
    rec(0, 1)
    expect(-ev.banker).toBeCloseTo(0.0106, 3)
    expect(-ev.player).toBeCloseTo(0.0124, 3)
    expect(-ev.tie).toBeGreaterThan(0.13); expect(-ev.tie).toBeLessThan(0.16)
  })
})

describe('house edge: crash', () => {
  it('exact: P(crash >= m) * m is 0.99 for any target', () => {
    // crash >= m  <=>  floor(99 / (1-u)) >= 100m  <=>  u >= 1 - 99/(100m) for u on the 2^-52 grid
    for (const m of [1.01, 1.5, 2, 10, 100]) {
      const u = 1 - 99 / (100 * m)
      expect(crashPointFromUniform(Math.min(u + 1e-9, 1 - 1e-12))).toBeGreaterThanOrEqual(m)
      expect((1 - u) * m).toBeCloseTo(0.99, 12)
    }
  })
  it('Monte Carlo cash-out at 2x returns ~99%', () => {
    const rng = seededRng(25)
    const N = 300_000
    let ret = 0
    for (let i = 0; i < N; i++) if (crashPointFromSeed(newCrashSeed(rng)) >= 2) ret += 2
    expect(ret / N).toBeGreaterThan(0.975)
    expect(ret / N).toBeLessThan(1.005)
  })
})

describe('house edge: dice (exact)', () => {
  it.each([[50, 'under'], [1, 'under'], [95, 'under'], [49.99, 'over'], [74.99, 'over'], [98.99, 'over']] as const)(
    'target %s %s returns 98.9-99%%', (target, direction) => {
      const bet = 10_000
      const mult = diceMultiplier(winChance(target, direction))
      let ret = 0
      for (let i = 0; i < 10000; i++) if (diceWins(i / 100, { target, direction })) ret += Math.floor(bet * mult)
      const rtp = ret / (10000 * bet)
      expect(rtp).toBeLessThanOrEqual(0.99 + 1e-9)
      expect(rtp).toBeGreaterThan(0.989)
    })
})
