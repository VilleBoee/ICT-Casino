import type { Card, Chips, RoundResult } from './types'
import { cryptoRng, shuffle, type Rng } from './rng'
import { newDeck } from './cards'
import { evaluate } from './poker'
import type { Wallet } from './wallet'

export type VpHand =
  | 'Royal Flush' | 'Straight Flush' | 'Four of a Kind' | 'Full House' | 'Flush'
  | 'Straight' | 'Three of a Kind' | 'Two Pair' | 'Jacks or Better' | 'Nothing'

/** Jacks or Better 9/6 full pay, "for one" (total returned per chip bet, so Jacks or Better is a push). */
export const VP_PAYTABLE: Record<VpHand, number> = {
  'Royal Flush': 800, 'Straight Flush': 50, 'Four of a Kind': 25, 'Full House': 9, Flush: 6,
  Straight: 4, 'Three of a Kind': 3, 'Two Pair': 2, 'Jacks or Better': 1, Nothing: 0,
}

/** Classifies a 5-card hand for Jacks or Better. */
export function classifyVp(cards: readonly Card[]): VpHand {
  if (cards.length !== 5) throw new Error('Need 5 cards')
  const v = evaluate(cards)
  if (v.name === 'One Pair') return v.ranks[0] >= 11 ? 'Jacks or Better' : 'Nothing'
  if (v.name === 'High Card') return 'Nothing'
  return v.name
}

export interface VideoPokerOutcome { cards: Card[]; held: boolean[]; hand: VpHand; multiplier: number }

export class VideoPokerRound {
  readonly bet: Chips
  cards: Card[]
  held = [false, false, false, false, false]
  phase: 'dealt' | 'done' = 'dealt'
  private deck: Card[]
  private id: string

  /** Debits the bet and deals 5 cards. */
  constructor(wallet: Wallet, bet: Chips, rng: Rng = cryptoRng, deck?: Card[]) {
    if (!Number.isInteger(bet) || bet <= 0) throw new Error('Bet must be a positive whole number')
    wallet.debit(bet)
    this.bet = bet
    this.id = `${Date.now().toString(36)}-${rng.int(1e9).toString(36)}`
    // deck[0] is dealt first; a custom deck is a test helper
    this.deck = deck ? [...deck] : shuffle(newDeck(), rng)
    this.cards = this.deck.splice(0, 5)
  }

  /** What the current cards would pay (for the "you have a pair" hint). */
  get currentHand(): VpHand { return classifyVp(this.cards) }

  toggleHold(i: number): void {
    if (this.phase !== 'dealt') throw new Error('Round finished')
    if (!Number.isInteger(i) || i < 0 || i > 4) throw new Error('Invalid card')
    this.held[i] = !this.held[i]
  }

  setHolds(held: boolean[]): void {
    if (this.phase !== 'dealt') throw new Error('Round finished')
    if (held.length !== 5) throw new Error('Need 5 hold flags')
    this.held = [...held]
  }

  /** Replaces non-held cards and finishes the round. */
  draw(): RoundResult<VideoPokerOutcome> {
    if (this.phase !== 'dealt') throw new Error('Already drawn')
    this.cards = this.cards.map((c, i) => (this.held[i] ? c : this.deck.shift()!))
    this.phase = 'done'
    return this.result()
  }

  result(): RoundResult<VideoPokerOutcome> {
    if (this.phase !== 'done') throw new Error('Round not finished')
    const hand = classifyVp(this.cards)
    const multiplier = VP_PAYTABLE[hand]
    return {
      game: 'videopoker', roundId: this.id, stake: this.bet, payout: this.bet * multiplier,
      outcome: { cards: this.cards, held: this.held, hand, multiplier },
    }
  }
}
