import type { Key, T } from './index'

/** Engine errors a player can actually hit, mapped to translated text. Anything else falls back to the engine's English message. */
const EXACT: Record<string, Key> = {
  'Insufficient balance': 'err.insufficient',
  'Bet must be a positive whole number': 'err.betWhole',
  'Line bet must be a positive whole number': 'err.betWhole',
  'Coin size must be a positive whole number': 'err.betWhole',
  'Place a bet': 'err.placeBet',
  'Place a bet first': 'err.placeBet',
  'Out of chips: rebuy or cash out': 'err.outOfChips',
  'Finish the hand before cashing out': 'err.finishHand',
  'Rebuy only between hands': 'err.rebuyBetween',
  'Not your turn': 'err.notYourTurn',
  'Target has at most 2 decimals': 'err.twoDecimals',
}
const PATTERNS: [RegExp, Key, string[]][] = [
  [/^Raise must be between (\d+) and (\d+)$/, 'err.raiseRange', ['min', 'max']],
  [/^Buy-in must be at least (\d+)$/, 'err.buyInMin', ['n']],
  [/^Auto cash-out must be at least ([\d.]+)x$/, 'err.autoMin', ['n']],
  [/^Win chance must be ([\d.]+)-([\d.]+)%$/, 'err.chance', ['min', 'max']],
]

export function errorText(e: unknown, t: T): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (EXACT[msg]) return t(EXACT[msg])
  for (const [re, key, names] of PATTERNS) {
    const m = msg.match(re)
    if (m) return t(key, Object.fromEntries(names.map((n, i) => [n, m[i + 1]])))
  }
  return msg
}
