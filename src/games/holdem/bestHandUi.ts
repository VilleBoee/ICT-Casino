import { bestHand, type BestHand, type Card } from '../../engine'
import type { Key, T } from '../../i18n'

/**
 * Localised best-hand label built from category + ranks via the i18n dictionaries
 * (`bh.<category>` templates and `rank.<n>` / `rank.<n>.pl` names). English matches the engine's `label`.
 */
export function handLabel(h: Pick<BestHand, 'name' | 'ranks'>, t: T): string {
  const [a, b] = h.ranks
  const one = (r: number | undefined) => (r ? t(`rank.${r}` as Key) : '')
  const many = (r: number | undefined) => (r ? t(`rank.${r}.pl` as Key) : '')
  return t(`bh.${h.name}` as Key, { a: one(a), A: many(a), B: many(b) })
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
