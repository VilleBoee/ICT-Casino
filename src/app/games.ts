import type { GameId } from '../engine/types'

export interface GameInfo {
  id: GameId
  name: string
  tagline: string
  icon: string
  /** True once the game's UI route is implemented. */
  ready: boolean
}

export const GAMES: GameInfo[] = [
  { id: 'roulette', name: 'Roulette', tagline: 'European wheel · 35:1 straight up', icon: '◎', ready: true },
  { id: 'blackjack', name: 'Blackjack', tagline: '6 decks · S17 · pays 3:2', icon: '♠', ready: true },
  { id: 'holdem', name: "Texas Hold'em", tagline: 'You vs 5 bots', icon: '♦', ready: false },
  { id: 'slots', name: 'Slots', tagline: 'Spin the reels', icon: '▣', ready: true },
  { id: 'videopoker', name: 'Video Poker', tagline: 'Jacks or Better', icon: '♥', ready: false },
  { id: 'baccarat', name: 'Baccarat', tagline: 'Player · Banker · Tie', icon: '♣', ready: true },
  { id: 'crash', name: 'Crash', tagline: 'Cash out before it crashes', icon: '↗', ready: true },
  { id: 'dice', name: 'Dice', tagline: 'Roll over / under', icon: '⚄', ready: true },
]
export const gameById = (id: string) => GAMES.find((g) => g.id === id)
