import type { Chips, RoundResult } from './types'
import { cryptoRng, type Rng } from './rng'
import type { Wallet } from './wallet'

export const CRASH_HOUSE_EDGE = 0.01
/** Growth rate: multiplier(t) = e^(GROWTH * t_ms). About 2x at 11.5 s, 10x at 38 s. */
export const CRASH_GROWTH = 0.00006
export const CRASH_MAX = 1_000_000
export const MIN_AUTO_CASHOUT = 1.01

/** Multiplier shown at time t (ms since launch), rounded down to 2 decimals. */
export const multiplierAt = (tMs: number) => Math.floor(Math.exp(CRASH_GROWTH * Math.max(0, tMs)) * 100) / 100
/** Time (ms) at which the curve reaches multiplier m. */
export const timeForMultiplier = (m: number) => Math.log(m) / CRASH_GROWTH

/**
 * Crash point from a uniform u in [0, 1): floor(99 / (1 - u)) / 100, at least 1.00.
 * P(crash >= m) = 0.99 / m, so every cash-out target has the same ~1% house edge.
 */
export function crashPointFromUniform(u: number): number {
  if (!(u >= 0 && u < 1)) throw new Error('u must be in [0, 1)')
  return Math.min(CRASH_MAX, Math.max(1, Math.floor((100 * (1 - CRASH_HOUSE_EDGE)) / (1 - u)) / 100))
}

/** Verifiable: the 13-hex-digit (52-bit) round seed fully determines the crash point. */
export function crashPointFromSeed(seed: string): number {
  if (!/^[0-9a-f]{13}$/.test(seed)) throw new Error('Seed must be 13 hex digits')
  return crashPointFromUniform(parseInt(seed, 16) / 2 ** 52)
}

export function newCrashSeed(rng: Rng = cryptoRng): string {
  // 52 bits from two draws: 26 + 26
  const hi = rng.int(2 ** 26), lo = rng.int(2 ** 26)
  return (hi * 2 ** 26 + lo).toString(16).padStart(13, '0')
}

export type CrashStatus = 'running' | 'cashed' | 'crashed'
export interface CrashOutcome { seed: string; crashPoint: number; cashedAt: number | null; auto: boolean }

export class CrashRound {
  readonly bet: Chips
  readonly autoCashOut: number | null
  status: CrashStatus = 'running'
  cashedAt: number | null = null
  private auto = false
  /** Decided at start; reveal it to the UI only after the round ends. */
  private readonly seed: string
  private readonly point: number
  private id: string

  /** Debits the bet and fixes the crash point before the animation starts. */
  constructor(wallet: Wallet, bet: Chips, opts: { autoCashOut?: number; rng?: Rng } = {}) {
    if (!Number.isInteger(bet) || bet <= 0) throw new Error('Bet must be a positive whole number')
    const ac = opts.autoCashOut
    if (ac !== undefined && !(ac >= MIN_AUTO_CASHOUT && ac <= CRASH_MAX)) throw new Error(`Auto cash-out must be at least ${MIN_AUTO_CASHOUT}x`)
    wallet.debit(bet)
    const rng = opts.rng ?? cryptoRng
    this.bet = bet
    this.autoCashOut = ac === undefined ? null : Math.floor(ac * 100) / 100
    this.seed = newCrashSeed(rng)
    this.point = crashPointFromSeed(this.seed)
    this.id = `${Date.now().toString(36)}-${rng.int(1e9).toString(36)}`
    if (this.point <= 1) this.status = 'crashed' // instant bust at 1.00x
  }

  /** When the line stops (ms after launch): the crash time, for the UI animation. */
  get crashTimeMs(): number { return timeForMultiplier(this.point) }
  get finished(): boolean { return this.status !== 'running' }

  /** Advances the clock. Applies auto cash-out and the crash. Returns the multiplier to display. */
  tick(tMs: number): { multiplier: number; status: CrashStatus } {
    if (this.status === 'running') {
      const m = multiplierAt(tMs)
      if (this.autoCashOut !== null && this.autoCashOut <= this.point && m >= this.autoCashOut) {
        this.status = 'cashed'; this.cashedAt = this.autoCashOut; this.auto = true
      } else if (m >= this.point) {
        this.status = 'crashed'
      }
    }
    return { multiplier: Math.min(multiplierAt(tMs), this.point), status: this.status }
  }

  /** Manual cash-out at time t. Returns false if it was too late. */
  cashOut(tMs: number): boolean {
    this.tick(tMs)
    if (this.status !== 'running') return this.status === 'cashed'
    this.status = 'cashed'
    this.cashedAt = multiplierAt(tMs)
    return true
  }

  /** Available once the round ended (cashed out or crashed). Pass to wallet.settle(). */
  result(): RoundResult<CrashOutcome> {
    if (!this.finished) throw new Error('Round still running')
    return {
      game: 'crash', roundId: this.id, stake: this.bet,
      payout: this.cashedAt === null ? 0 : Math.floor(this.bet * this.cashedAt),
      outcome: { seed: this.seed, crashPoint: this.point, cashedAt: this.cashedAt, auto: this.auto },
    }
  }

  /** Ends the round for a player who never cashed out (runs the clock to the crash). */
  finish(): RoundResult<CrashOutcome> {
    if (!this.finished) this.tick(this.crashTimeMs + 1)
    return this.result()
  }
}
