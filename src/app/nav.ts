import type { GameId } from '../engine/types'
import { GAMES } from './games'

/** The game a hash path points at, if any ("/game/plinko" -> "plinko"). */
export function activeGameId(path: string): GameId | null {
  const m = path.match(/^\/game\/([\w-]+)$/)
  return m && GAMES.some((g) => g.id === m[1]) ? (m[1] as GameId) : null
}

/** The nav bar is hidden on the lobby (the lobby already is a big game list). */
export const showNav = (path: string) => path !== '/'

/** scrollLeft that centres an item in a scroll strip, clamped to the strip's range. */
export function centredScroll(viewW: number, scrollW: number, itemLeft: number, itemW: number): number {
  const max = Math.max(0, scrollW - viewW)
  return Math.min(max, Math.max(0, Math.round(itemLeft + itemW / 2 - viewW / 2)))
}
