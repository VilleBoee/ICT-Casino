import type { Chips, GameId, RoundResult, WalletState } from './types'

export const STORAGE_KEY = 'ict-casino:wallet'
export const STARTING_BALANCE: Chips = 1000
export const DAILY_REFILL: Chips = 500
const DAY_MS = 24 * 60 * 60 * 1000
const HISTORY_LIMIT = 200

export interface Storage { getItem(k: string): string | null; setItem(k: string, v: string): void }

const fresh = (now: number): WalletState => ({ version: 1, balance: STARTING_BALANCE, lastRefill: now, history: [] })

export class Wallet {
  private state: WalletState
  private listeners = new Set<(s: WalletState) => void>()

  private storage: Storage
  private now: () => number

  constructor(storage: Storage = localStorage, now: () => number = Date.now) {
    this.storage = storage
    this.now = now
    this.state = this.load()
  }

  private load(): WalletState {
    try {
      const raw = this.storage.getItem(STORAGE_KEY)
      const s = raw ? (JSON.parse(raw) as WalletState) : null
      if (s && s.version === 1 && Number.isInteger(s.balance) && s.balance >= 0) return s
    } catch { /* corrupted, reset below */ }
    return fresh(this.now())
  }

  private save() {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    this.listeners.forEach((l) => l(this.state))
  }

  get balance(): Chips { return this.state.balance }
  get snapshot(): WalletState { return this.state }

  subscribe(fn: (s: WalletState) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  /** Deducts the stake. Throws if invalid or unaffordable. */
  debit(amount: Chips): void {
    if (!Number.isInteger(amount) || amount <= 0) throw new Error('Bet must be a positive whole number')
    if (amount > this.state.balance) throw new Error('Insufficient balance')
    this.state = { ...this.state, balance: this.state.balance - amount }
    this.save()
  }

  /** Credits the payout of a finished round and records it. */
  settle(result: Pick<RoundResult, 'game' | 'stake' | 'payout'>): void {
    const { game, stake, payout } = result
    if (!Number.isInteger(payout) || payout < 0) throw new Error('Invalid payout')
    const history = [{ game, stake, payout, at: this.now() }, ...this.state.history].slice(0, HISTORY_LIMIT)
    this.state = { ...this.state, balance: this.state.balance + payout, history }
    this.save()
  }

  canRefill(): boolean { return this.now() - this.state.lastRefill >= DAY_MS }

  /** Daily free chips. Returns false if not yet available. */
  refill(): boolean {
    if (!this.canRefill()) return false
    this.state = { ...this.state, balance: this.state.balance + DAILY_REFILL, lastRefill: this.now() }
    this.save()
    return true
  }

  reset(): void { this.state = fresh(this.now()); this.save() }
}

export type { GameId }
