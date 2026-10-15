import type { Card, Chips, RoundResult } from './types'
import { Shoe } from './cards'
import type { Wallet } from './wallet'

/** Rules: 6 decks, dealer stands on soft 17, blackjack pays 3:2, double on any two,
 *  split pairs up to 4 hands, split aces get one card each, no insurance/surrender. */
export const MAX_HANDS = 4

export const cardValue = (c: Card) => (c.rank === 14 ? 11 : Math.min(c.rank, 10))

export function handTotal(cards: Card[]): { total: number; soft: boolean } {
  let total = 0, aces = 0
  for (const c of cards) { total += cardValue(c); if (c.rank === 14) aces++ }
  while (total > 21 && aces > 0) { total -= 10; aces-- }
  return { total, soft: aces > 0 }
}
export const isBlackjack = (cards: Card[]) => cards.length === 2 && handTotal(cards).total === 21

export type HandStatus = 'playing' | 'stood' | 'bust' | 'blackjack'
export interface BjHand { cards: Card[]; bet: Chips; status: HandStatus; doubled: boolean; fromSplit: boolean }
export type HandResult = 'win' | 'lose' | 'push' | 'blackjack'
export type Action = 'hit' | 'stand' | 'double' | 'split'

export interface BlackjackState {
  phase: 'player' | 'done'
  hands: BjHand[]
  active: number
  dealer: Card[]
  /** Dealer hole card stays hidden in the UI until phase === 'done'. */
  results?: { result: HandResult; payout: Chips }[]
}

export interface BlackjackOutcome { hands: BjHand[]; dealer: Card[]; results: { result: HandResult; payout: Chips }[] }

export class BlackjackRound {
  state: BlackjackState
  private wallet: Wallet
  private shoe: Shoe
  private baseBet: Chips
  private id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  /** Deducts the bet and deals. Check `state.phase`: naturals finish instantly. */
  constructor(wallet: Wallet, bet: Chips, shoe: Shoe) {
    wallet.debit(bet)
    this.wallet = wallet
    this.shoe = shoe
    this.baseBet = bet
    const p = [shoe.draw()], d = [shoe.draw()]
    p.push(shoe.draw()); d.push(shoe.draw())
    this.state = {
      phase: 'player', active: 0, dealer: d,
      hands: [{ cards: p, bet, status: isBlackjack(p) ? 'blackjack' : 'playing', doubled: false, fromSplit: false }],
    }
    if (isBlackjack(p) || isBlackjack(d)) this.finish()
  }

  get hand(): BjHand { return this.state.hands[this.state.active] }

  legalActions(): Action[] {
    if (this.state.phase !== 'player') return []
    const h = this.hand, two = h.cards.length === 2
    const acts: Action[] = ['hit', 'stand']
    const splitAces = h.fromSplit && h.cards[0].rank === 14
    if (splitAces) return ['stand']
    if (two && this.wallet.balance >= h.bet) {
      acts.push('double')
      if (cardValue(h.cards[0]) === cardValue(h.cards[1]) && this.state.hands.length < MAX_HANDS) acts.push('split')
    }
    return acts
  }

  act(a: Action): void {
    if (!this.legalActions().includes(a)) throw new Error(`Illegal action: ${a}`)
    const h = this.hand
    switch (a) {
      case 'hit':
        h.cards.push(this.shoe.draw())
        if (handTotal(h.cards).total > 21) h.status = 'bust'
        else if (handTotal(h.cards).total === 21) h.status = 'stood'
        break
      case 'stand': h.status = 'stood'; break
      case 'double':
        this.wallet.debit(h.bet); h.bet *= 2; h.doubled = true
        h.cards.push(this.shoe.draw())
        h.status = handTotal(h.cards).total > 21 ? 'bust' : 'stood'
        break
      case 'split': {
        this.wallet.debit(h.bet)
        const moved = h.cards.pop()!
        h.cards.push(this.shoe.draw()); h.fromSplit = true
        const second: BjHand = { cards: [moved, this.shoe.draw()], bet: h.bet, status: 'playing', doubled: false, fromSplit: true }
        this.state.hands.splice(this.state.active + 1, 0, second)
        for (const x of [h, second]) {
          if (x.cards[0].rank === 14 || handTotal(x.cards).total === 21) x.status = 'stood'
        }
        break
      }
    }
    this.advance()
  }

  private advance() {
    while (this.state.active < this.state.hands.length && this.hand.status !== 'playing') this.state.active++
    if (this.state.active >= this.state.hands.length) this.finish()
    else if (this.hand.fromSplit && this.hand.cards[0].rank === 14) this.hand.status = 'stood', this.advance()
  }

  private finish() {
    this.state.active = Math.min(this.state.active, this.state.hands.length - 1)
    const d = this.state.dealer
    const anyLive = this.state.hands.some((h) => h.status === 'stood')
    if (anyLive && !isBlackjack(d)) while (handTotal(d).total < 17) d.push(this.shoe.draw()) // S17
    const dt = handTotal(d).total, dbj = isBlackjack(d)
    this.state.results = this.state.hands.map((h) => {
      const pt = handTotal(h.cards).total
      const natural = h.status === 'blackjack' && !h.fromSplit
      let result: HandResult
      if (natural) result = dbj ? 'push' : 'blackjack'
      else if (h.status === 'bust') result = 'lose'
      else if (dbj) result = 'lose'
      else if (dt > 21 || pt > dt) result = 'win'
      else result = pt === dt ? 'push' : 'lose'
      const payout = result === 'blackjack' ? h.bet + Math.floor((h.bet * 3) / 2)
        : result === 'win' ? h.bet * 2 : result === 'push' ? h.bet : 0
      return { result, payout }
    })
    this.state.phase = 'done'
  }

  /** Available once phase === 'done'. Pass to wallet.settle() after the reveal animation. */
  result(): RoundResult<BlackjackOutcome> {
    if (this.state.phase !== 'done') throw new Error('Round not finished')
    const results = this.state.results!
    return {
      game: 'blackjack', roundId: this.id,
      stake: this.state.hands.reduce((s, h) => s + h.bet, 0) || this.baseBet,
      payout: results.reduce((s, r) => s + r.payout, 0),
      outcome: { hands: this.state.hands, dealer: this.state.dealer, results },
    }
  }
}
