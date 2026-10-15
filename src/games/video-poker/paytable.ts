import { VP_HANDS, VP_MAX_COINS, vpPaytable, type VpHand } from '../../engine/videopoker'

/** Paytable rows top → bottom (excluding "Nothing"). */
export const VP_ROWS = VP_HANDS.filter((h) => h !== 'Nothing')
export const COINS = Array.from({ length: VP_MAX_COINS }, (_, i) => i + 1)

/** Coins returned for a hand at a given coin count — straight from the engine (incl. the max-coin royal bonus). */
export const payFor = (hand: VpHand, coins: number) => vpPaytable(coins)[hand]

/** Map keyboard key → card index for HOLD toggles (1–5). */
export const holdKey = (key: string): number | null => (/^[1-5]$/.test(key) ? Number(key) - 1 : null)
