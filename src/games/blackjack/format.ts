import { handTotal } from '../../engine/blackjack'
import type { Card } from '../../engine/types'

/** "7/17" for soft totals below 21, otherwise the single best total. */
export function totalLabel(cards: Card[]): string {
  if (cards.length === 0) return ''
  const { total, soft } = handTotal(cards)
  return soft && total < 21 ? `${total - 10}/${total}` : String(total)
}
