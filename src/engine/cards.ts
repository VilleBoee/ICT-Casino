import type { Card, Rank, Suit } from './types'
import { cryptoRng, shuffle, type Rng } from './rng'

export const SUITS: Suit[] = ['S', 'H', 'D', 'C']
export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

export function newDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })))
}

/** Multi-deck shoe that reshuffles when it runs below the cut card. */
export class Shoe {
  private cards: Card[] = []
  private decks: number
  private rng: Rng
  private cut: number
  constructor(decks = 6, rng: Rng = cryptoRng, penetration = 0.75) {
    this.decks = decks
    this.rng = rng
    this.cut = Math.floor(decks * 52 * (1 - penetration))
    this.reshuffle()
  }
  reshuffle() { this.cards = shuffle(Array.from({ length: this.decks }, newDeck).flat(), this.rng) }
  get needsShuffle() { return this.cards.length <= this.cut }
  draw(): Card {
    if (this.cards.length === 0) this.reshuffle()
    return this.cards.pop()!
  }
  /** Test helper: stack the shoe so `cards[0]` is drawn first. */
  static stacked(cards: Card[]): Shoe {
    const s = new Shoe(1)
    s.cards = [...cards].reverse()
    s.cut = -1
    return s
  }
}
