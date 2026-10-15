/** All chip amounts are integers. */
export type Chips = number

export type GameId =
  | 'roulette' | 'blackjack' | 'holdem' | 'slots'
  | 'videopoker' | 'baccarat' | 'crash' | 'dice'

export type Suit = 'S' | 'H' | 'D' | 'C'
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 // 11=J 12=Q 13=K 14=A
export interface Card { rank: Rank; suit: Suit }

/**
 * Shared round contract: the stake is deducted when the round starts, the
 * outcome is decided before any animation, and the payout is returned
 * separately. The UI calls wallet.settle(result) once the animation ends.
 */
export interface RoundResult<TOutcome = unknown> {
  game: GameId
  roundId: string
  stake: Chips
  /** Total returned to the player, including stake (0 on a loss). */
  payout: Chips
  outcome: TOutcome
}

export interface WalletState {
  version: 1
  balance: Chips
  lastRefill: number // epoch ms
  history: { game: GameId; stake: Chips; payout: Chips; at: number }[]
}
