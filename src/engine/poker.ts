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
