import { bestHand, type BestHand, type Card, type Lang } from '../../engine'

/** Finnish rank names [singular, plural]. (Move into fi.ts once the i18n dictionaries (#72) land.) */
const FI_RANK: Record<number, [string, string]> = {
  2: ['kakkonen', 'kakkoset'], 3: ['kolmonen', 'kolmoset'], 4: ['nelonen', 'neloset'], 5: ['vitonen', 'vitoset'],
  6: ['kutonen', 'kutoset'], 7: ['seiska', 'seiskat'], 8: ['kasi', 'kasit'], 9: ['ysi', 'ysit'], 10: ['kymppi', 'kympit'],
  11: ['jätkä', 'jätkät'], 12: ['kuningatar', 'kuningattaret'], 13: ['kuningas', 'kuninkaat'], 14: ['ässä', 'ässät'],
}
const fiRank = (r: number, plural = false) => FI_RANK[r][plural ? 1 : 0]

/** Localised best-hand label built from category/ranks (the engine's `label` is always English). */
export function handLabel(h: Pick<BestHand, 'name' | 'ranks' | 'label'>, lang: Lang): string {
  if (lang !== 'fi') return h.label
  const [a, b] = h.ranks
  switch (h.name) {
    case 'High Card': return `Hai, ${fiRank(a)}`
    case 'One Pair': return `Pari, ${fiRank(a, true)}`
    case 'Two Pair': return `Kaksi paria, ${fiRank(a, true)} ja ${fiRank(b, true)}`
    case 'Three of a Kind': return `Kolmoset, ${fiRank(a, true)}`
    case 'Straight': return `Suora, ${fiRank(a)} korkein`
    case 'Flush': return `Väri, ${fiRank(a)} korkein`
    case 'Full House': return `Täyskäsi, ${fiRank(a, true)} ja ${fiRank(b, true)}`
    case 'Four of a Kind': return `Neloset, ${fiRank(a, true)}`
    case 'Straight Flush': return `Värisuora, ${fiRank(a)} korkein`
    case 'Royal Flush': return 'Kuningasvärisuora'
  }
}

/** Best hand from hole + board, or null when there's nothing to evaluate. */
export function liveBest(hole: readonly Card[], board: readonly Card[]): BestHand | null {
  const cards = [...hole, ...board]
  return hole.length === 2 && cards.length >= 2 && cards.length <= 7 ? bestHand(cards) : null
}

export const sameCard = (a: Card, b: Card) => a.rank === b.rank && a.suit === b.suit
/** Should this card glow? Only from the flop on, and only the cards that make the category. */
export const glows = (best: BestHand | null, board: readonly Card[], c: Card) =>
  !!best && board.length >= 3 && best.cards.some((x) => sameCard(x, c))
