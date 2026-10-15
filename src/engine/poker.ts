import type { Card, Rank } from './types'

/** Hand categories, weakest to strongest. */
export const HAND_CATEGORIES = [
  'High Card', 'One Pair', 'Two Pair', 'Three of a Kind', 'Straight',
  'Flush', 'Full House', 'Four of a Kind', 'Straight Flush',
] as const
export type HandCategory = (typeof HAND_CATEGORIES)[number]

export interface HandValue {
  /** Comparable score: higher wins, equal is a tie. */
  score: number
  category: number
  name: HandCategory | 'Royal Flush'
  /** Ranks that decide the hand, most significant first (category ranks, then kickers). */
  ranks: Rank[]
}

const score = (cat: number, ranks: number[]) => {
  let s = cat
  for (let i = 0; i < 5; i++) s = s * 16 + (ranks[i] ?? 0)
  return s
}

/** Highest straight in a rank bitmask (bit r set for rank r), or 0. Handles the A-5 wheel. */
function straightHigh(mask: number): number {
  if (mask & (1 << 14)) mask |= 1 << 1
  for (let hi = 14; hi >= 5; hi--) {
    const need = 0b11111 << (hi - 4)
    if ((mask & need) === need) return hi
  }
  return 0
}

/** Evaluates the best 5-card hand from 5 to 7 cards. */
export function evaluate(cards: readonly Card[]): HandValue {
  if (cards.length < 5 || cards.length > 7) throw new Error('Evaluate needs 5-7 cards')
  const counts = new Array<number>(15).fill(0)
  const bySuit: Record<string, number[]> = { S: [], H: [], D: [], C: [] }
  let mask = 0
  for (const c of cards) {
    counts[c.rank]++
    bySuit[c.suit].push(c.rank)
    mask |= 1 << c.rank
  }
  const make = (cat: number, ranks: number[]): HandValue => ({
    score: score(cat, ranks), category: cat,
    name: cat === 8 && ranks[0] === 14 ? 'Royal Flush' : HAND_CATEGORIES[cat],
    ranks: ranks as Rank[],
  })

  const flush = Object.values(bySuit).find((r) => r.length >= 5)
  if (flush) {
    const sfHigh = straightHigh(flush.reduce((m, r) => m | (1 << r), 0))
    if (sfHigh) return make(8, [sfHigh])
  }
  const desc: number[] = []
  for (let r = 14; r >= 2; r--) if (counts[r]) desc.push(r)
  const quads = desc.filter((r) => counts[r] === 4)
  const trips = desc.filter((r) => counts[r] === 3)
  const pairs = desc.filter((r) => counts[r] === 2)
  const kickers = (exclude: number[], n: number) => desc.filter((r) => !exclude.includes(r)).slice(0, n)

  if (quads.length) return make(7, [quads[0], ...kickers([quads[0]], 1)])
  if (trips.length && (trips.length > 1 || pairs.length)) {
    const pair = [...trips.slice(1), ...pairs].sort((a, b) => b - a)[0]
    return make(6, [trips[0], pair])
  }
  if (flush) return make(5, [...flush].sort((a, b) => b - a).slice(0, 5))
  const st = straightHigh(mask)
  if (st) return make(4, [st])
  if (trips.length) return make(3, [trips[0], ...kickers([trips[0]], 2)])
  if (pairs.length >= 2) return make(2, [pairs[0], pairs[1], ...kickers([pairs[0], pairs[1]], 1)])
  if (pairs.length) return make(1, [pairs[0], ...kickers([pairs[0]], 3)])
  return make(0, desc.slice(0, 5))
}

/** Positive if a beats b, negative if b wins, 0 on a tie. */
export const compareHands = (a: readonly Card[], b: readonly Card[]) => evaluate(a).score - evaluate(b).score

const RANK_NAME: Record<number, [string, string]> = {
  2: ['Two', 'Twos'], 3: ['Three', 'Threes'], 4: ['Four', 'Fours'], 5: ['Five', 'Fives'],
  6: ['Six', 'Sixes'], 7: ['Seven', 'Sevens'], 8: ['Eight', 'Eights'], 9: ['Nine', 'Nines'],
  10: ['Ten', 'Tens'], 11: ['Jack', 'Jacks'], 12: ['Queen', 'Queens'], 13: ['King', 'Kings'], 14: ['Ace', 'Aces'],
}
/** English rank names, e.g. rankName(13) = 'King', rankName(13, true) = 'Kings'. */
export const rankName = (r: number, plural = false) => RANK_NAME[r][plural ? 1 : 0]

export interface BestHand extends HandValue {
  /** Readable label, e.g. 'Pair of Kings', 'Two Pair, Aces and Eights', 'Flush, Ace high'. */
  label: string
  /** The 1-5 cards that make the category (pair, trips, the five of a straight...), for highlighting. */
  cards: Card[]
  /** Remaining cards of the best five, in kicker order. */
  kickers: Card[]
}

function label(v: HandValue): string {
  const [a, b] = v.ranks
  switch (v.name) {
    case 'High Card': return `High Card, ${rankName(a)}`
    case 'One Pair': return `Pair of ${rankName(a, true)}`
    case 'Two Pair': return `Two Pair, ${rankName(a, true)} and ${rankName(b, true)}`
    case 'Three of a Kind': return `Three of a Kind, ${rankName(a, true)}`
    case 'Straight': return `Straight, ${rankName(a)} high`
    case 'Flush': return `Flush, ${rankName(a)} high`
    case 'Full House': return `Full House, ${rankName(a, true)} over ${rankName(b, true)}`
    case 'Four of a Kind': return `Four of a Kind, ${rankName(a, true)}`
    case 'Straight Flush': return `Straight Flush, ${rankName(a)} high`
    case 'Royal Flush': return 'Royal Flush'
  }
}

/** Evaluates fewer than 5 cards: only high card, pairs, trips or quads are possible. */
function evaluatePartial(cards: readonly Card[]): HandValue {
  const counts = new Array<number>(15).fill(0)
  for (const c of cards) counts[c.rank]++
  const desc: number[] = []
  for (let r = 14; r >= 2; r--) if (counts[r]) desc.push(r)
  const of = (n: number) => desc.filter((r) => counts[r] === n)
  const kick = (ex: number[]) => desc.filter((r) => !ex.includes(r))
  const [q, t, p] = [of(4), of(3), of(2)]
  let cat: number, ranks: number[]
  if (q.length) { cat = 7; ranks = [q[0], ...kick([q[0]])] }
  else if (t.length) { cat = 3; ranks = [t[0], ...kick([t[0]])] }
  else if (p.length >= 2) { cat = 2; ranks = [p[0], p[1], ...kick([p[0], p[1]])] }
  else if (p.length) { cat = 1; ranks = [p[0], ...kick([p[0]])] }
  else { cat = 0; ranks = desc }
  return { score: score(cat, ranks), category: cat, name: HAND_CATEGORIES[cat], ranks: ranks as Rank[] }
}

function* fives(cards: readonly Card[]): Generator<Card[]> {
  const n = cards.length
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++)
    for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) yield [cards[a], cards[b], cards[c], cards[d], cards[e]]
}

/** Splits the best five into the cards that make the category and the kickers. */
function splitCards(v: HandValue, five: Card[]): { cards: Card[]; kickers: Card[] } {
  const byRankDesc = (x: Card, y: Card) => y.rank - x.rank
  if ([4, 5, 8].includes(v.category)) {
    // Straights: order high to low, with the wheel's ace last.
    const hi = v.ranks[0]
    const key = (c: Card) => (v.category !== 5 && hi === 5 && c.rank === 14 ? 1 : c.rank)
    return { cards: [...five].sort((x, y) => key(y) - key(x)), kickers: [] }
  }
  const core = v.category === 0 ? v.ranks.slice(0, 1) : v.category === 6 ? v.ranks.slice(0, 2)
    : v.category === 2 ? v.ranks.slice(0, 2) : v.ranks.slice(0, 1)
  const cards = five.filter((c) => core.includes(c.rank)).sort((x, y) => core.indexOf(x.rank) - core.indexOf(y.rank) || byRankDesc(x, y))
  const kickers = five.filter((c) => !core.includes(c.rank)).sort(byRankDesc)
  if (v.category === 0) return { cards: cards.slice(0, 1), kickers: [...cards.slice(1), ...kickers].sort(byRankDesc) }
  return { cards, kickers }
}

/**
 * Best hand from any 2-7 cards (hole cards plus whatever board is out), for the live
 * hand indicator. With fewer than 5 cards only high card, pairs, trips and quads exist.
 * `score` is comparable only between hands with the same number of cards.
 */
export function bestHand(cards: readonly Card[]): BestHand {
  if (cards.length < 1 || cards.length > 7) throw new Error('bestHand needs 1-7 cards')
  if (cards.length < 5) {
    const v = evaluatePartial(cards)
    const { cards: core, kickers } = splitCards(v, [...cards])
    return { ...v, label: label(v), cards: core, kickers }
  }
  let best: Card[] = []
  let bestV: HandValue | null = null
  for (const five of fives(cards)) {
    const v = evaluate(five)
    if (!bestV || v.score > bestV.score) { bestV = v; best = five }
  }
  const { cards: core, kickers } = splitCards(bestV!, best)
  return { ...bestV!, label: label(bestV!), cards: core, kickers }
}
