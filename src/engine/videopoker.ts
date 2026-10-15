import type { Card, Chips, RoundResult } from './types'
import { cryptoRng, shuffle, type Rng } from './rng'
import { newDeck } from './cards'
import { evaluate } from './poker'
import type { Wallet } from './wallet'

export type VpHand =
  | 'Royal Flush' | 'Straight Flush' | 'Four of a Kind' | 'Full House' | 'Flush'
  | 'Straight' | 'Three of a Kind' | 'Two Pair' | 'Jacks or Better' | 'Nothing'

export const VP_MAX_COINS = 5
/** Royal flush pays 800 per coin only when playing max coins (4000 for 5). */
export const VP_MAX_COIN_ROYAL = 800

/**
 * Jacks or Better 9/6 full pay per coin, "for one" (total returned, so Jacks or Better is a push).
 * The royal is 250 per coin for 1-4 coins; see vpPaytable() for the max-coin bonus.
 */
export const VP_PAYTABLE: Record<VpHand, number> = {
  'Royal Flush': 250, 'Straight Flush': 50, 'Four of a Kind': 25, 'Full House': 9, Flush: 6,
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

export const VP_HANDS = Object.keys(VP_PAYTABLE) as VpHand[]

/** Total coins returned per hand for a given coin count (1-5): the classic machine paytable column. */
export function vpPaytable(coins: number): Record<VpHand, number> {
  if (!Number.isInteger(coins) || coins < 1 || coins > VP_MAX_COINS) throw new Error(`Coins must be 1-${VP_MAX_COINS}`)
  const t = {} as Record<VpHand, number>
  for (const h of VP_HANDS) t[h] = h === 'Royal Flush' && coins === VP_MAX_COINS ? VP_MAX_COIN_ROYAL * coins : VP_PAYTABLE[h] * coins
  return t
}

export interface VpBet { coins: number; coinSize: Chips }
export interface VideoPokerOutcome { cards: Card[]; held: boolean[]; hand: VpHand; coins: number; coinSize: Chips; coinsWon: number; multiplier: number }

export class VideoPokerRound {
  readonly bet: Chips
  readonly coins: number
  readonly coinSize: Chips
  cards: Card[]
  held = [false, false, false, false, false]
  phase: 'dealt' | 'done' = 'dealt'
  private deck: Card[]
  private id: string

  /** Debits coins x coinSize and deals 5 cards. */
  constructor(wallet: Wallet, bet: VpBet, rng: Rng = cryptoRng, deck?: Card[]) {
    vpPaytable(bet.coins) // validates coins
    if (!Number.isInteger(bet.coinSize) || bet.coinSize <= 0) throw new Error('Coin size must be a positive whole number')
    this.coins = bet.coins
    this.coinSize = bet.coinSize
    this.bet = bet.coins * bet.coinSize
    wallet.debit(this.bet)
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
    const coinsWon = vpPaytable(this.coins)[hand]
    return {
      game: 'videopoker', roundId: this.id, stake: this.bet, payout: coinsWon * this.coinSize,
      outcome: { cards: this.cards, held: this.held, hand, coins: this.coins, coinSize: this.coinSize, coinsWon, multiplier: coinsWon / this.coins },
    }
  }
}
