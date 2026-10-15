import type { Card, Chips, RoundResult } from './types'
import { cryptoRng, shuffle, type Rng } from './rng'
import { newDeck } from './cards'
import { evaluate, type HandValue } from './poker'
import type { Wallet } from './wallet'

export type BotStyle = 'tight' | 'loose' | 'bluffer'
export type Street = 'preflop' | 'flop' | 'turn' | 'river'
export type HoldemPhase = 'idle' | Street | 'handOver' | 'closed'

export type PokerAction =
  | { type: 'fold' } | { type: 'check' } | { type: 'call' } | { type: 'allin' }
  | { type: 'bet' | 'raise'; to: Chips }

export interface Seat {
  index: number
  name: string
  human: boolean
  style: BotStyle | null
  stack: Chips
  /** Chips put in on the current street. */
  bet: Chips
  /** Chips put in this hand (all streets). */
  committed: Chips
  hole: Card[]
  folded: boolean
  allIn: boolean
  acted: boolean
  /** False after an incomplete all-in raise: this seat may only call or fold. */
  canRaise: boolean
  lastAction: string | null
}

export interface LegalActions {
  fold: boolean
  check: boolean
  /** Amount needed to call (0 if no call is possible). */
  call: Chips
  /** 'bet' when nobody has bet this street, else 'raise'; null if not allowed. Values are "raise to" totals. */
  raise: { kind: 'bet' | 'raise'; min: Chips; max: Chips } | null
}

export interface Pot { amount: Chips; eligible: number[] }
export interface PotWin { amount: Chips; winners: number[]; hand: HandValue['name'] | null }
export interface HandSummary {
  handNo: number
  board: Card[]
  pots: PotWin[]
  /** Net chips won per seat index (total awarded). */
  won: Record<number, Chips>
  /** Revealed hands at showdown (empty if everyone else folded). */
  shown: { seat: number; hole: Card[]; hand: HandValue }[]
}

export interface LogEntry { handNo: number; street: Street; seat: number; action: string; amount: Chips }

export interface HoldemOptions {
  buyIn: Chips
  bots?: number
  smallBlind?: Chips
  bigBlind?: Chips
  rng?: Rng
  styles?: BotStyle[]
  /** Monte Carlo samples per bot decision. */
  botSims?: number
}

export const BOT_NAMES = ['NullPointer', 'Segfault', 'StackOverflow', 'RaceCondition', 'DeadLock', 'BitFlip', 'CacheMiss', 'OffByOne']
const DEFAULT_STYLES: BotStyle[] = ['tight', 'loose', 'bluffer']

/** Splits contributions into main and side pots. Folded chips stay in the pot but their seats can't win. */
export function buildPots(seats: Pick<Seat, 'index' | 'committed' | 'folded'>[]): Pot[] {
  const levels = [...new Set(seats.filter((s) => !s.folded && s.committed > 0).map((s) => s.committed))].sort((a, b) => a - b)
  const pots: Pot[] = []
  let prev = 0
  for (const lvl of levels) {
    const amount = seats.reduce((sum, s) => sum + Math.max(0, Math.min(s.committed, lvl) - prev), 0)
    const eligible = seats.filter((s) => !s.folded && s.committed >= lvl).map((s) => s.index)
    if (amount > 0) pots.push({ amount, eligible })
    prev = lvl
  }
  // folded chips above the highest live contribution go to the last pot
  const rest = seats.reduce((sum, s) => sum + Math.max(0, s.committed - prev), 0)
  if (rest > 0 && pots.length) pots[pots.length - 1].amount += rest
  return pots
}

/** Win probability vs `opponents` random hands, by Monte Carlo. Ties count as a share. */
export function estimateEquity(hole: Card[], board: Card[], opponents: number, rng: Rng, sims = 150): number {
  const known = new Set([...hole, ...board].map((c) => c.rank * 4 + 'SHDC'.indexOf(c.suit)))
  const deck = newDeck().filter((c) => !known.has(c.rank * 4 + 'SHDC'.indexOf(c.suit)))
  let total = 0
  for (let i = 0; i < sims; i++) {
    // partial Fisher-Yates: only draw what we need
    const need = 5 - board.length + opponents * 2
    const d = deck.slice()
    for (let k = 0; k < need; k++) {
      const j = k + rng.int(d.length - k)
      ;[d[k], d[j]] = [d[j], d[k]]
    }
    const full = [...board, ...d.slice(0, 5 - board.length)]
    const mine = evaluate([...hole, ...full]).score
    let ties = 0, lost = false
    for (let o = 0; o < opponents; o++) {
      const off = 5 - board.length + o * 2
      const s = evaluate([d[off], d[off + 1], ...full]).score
      if (s > mine) { lost = true; break }
      if (s === mine) ties++
    }
    if (!lost) total += 1 / (ties + 1)
  }
  return total / sims
}

/**
 * margin: equity needed above pot odds to call; value: relative strength (1 = average) to value-raise;
 * aggro: chance to raise when strong; bluff: chance to bet/raise with nothing.
 */
export const BOT_STYLES = {
  tight: { margin: 0.05, value: 1.7, aggro: 0.6, bluff: 0.03 },
  loose: { margin: -0.12, value: 1.4, aggro: 0.4, bluff: 0.08 },
  bluffer: { margin: -0.03, value: 1.3, aggro: 0.7, bluff: 0.3 },
} as const
const STYLE = BOT_STYLES

export class HoldemTable {
  seats: Seat[]
  board: Card[] = []
  phase: HoldemPhase = 'idle'
  dealer = -1
  toAct: number | null = null
  currentBet: Chips = 0
  minRaise: Chips
  handNo = 0
  lastHand: HandSummary | null = null
  log: LogEntry[] = []
  readonly smallBlind: Chips
  readonly bigBlind: Chips
  /** Total chips the human has bought in for (the stake). */
  totalBuyIn: Chips
  private deck: Card[] = []
  private wallet: Wallet
  private rng: Rng
  private botSims: number
  private botBuyIn: Chips
  private id: string

  constructor(wallet: Wallet, opts: HoldemOptions) {
    const bots = opts.bots ?? 5
    if (!Number.isInteger(bots) || bots < 5 || bots > 8) throw new Error('Table needs 5-8 bots')
    this.bigBlind = opts.bigBlind ?? 20
    this.smallBlind = opts.smallBlind ?? Math.floor(this.bigBlind / 2)
    if (!Number.isInteger(this.bigBlind) || this.smallBlind <= 0 || this.smallBlind > this.bigBlind) throw new Error('Invalid blinds')
    if (opts.buyIn < this.bigBlind * 10) throw new Error(`Buy-in must be at least ${this.bigBlind * 10}`)
    wallet.debit(opts.buyIn)
    this.wallet = wallet
    this.rng = opts.rng ?? cryptoRng
    this.botSims = opts.botSims ?? 150
    this.minRaise = this.bigBlind
    this.totalBuyIn = opts.buyIn
    this.botBuyIn = opts.buyIn
    this.id = `${Date.now().toString(36)}-${this.rng.int(1e9).toString(36)}`
    const styles = opts.styles ?? DEFAULT_STYLES
    const mk = (i: number, human: boolean): Seat => ({
      index: i, name: human ? 'You' : BOT_NAMES[i - 1], human, style: human ? null : styles[(i - 1) % styles.length],
      stack: opts.buyIn, bet: 0, committed: 0, hole: [], folded: false, allIn: false, acted: false, canRaise: true, lastAction: null,
    })
    this.seats = Array.from({ length: bots + 1 }, (_, i) => mk(i, i === 0))
  }

  get human(): Seat { return this.seats[0] }
  get pot(): Chips { return this.seats.reduce((s, x) => s + x.committed, 0) }
  get pots(): Pot[] { return buildPots(this.seats) }
  get inHand(): boolean { return this.phase !== 'idle' && this.phase !== 'handOver' && this.phase !== 'closed' }
  get isHumanTurn(): boolean { return this.toAct === 0 }
  get isBotTurn(): boolean { return this.toAct !== null && this.toAct !== 0 }

  private next(from: number, pred: (s: Seat) => boolean): number | null {
    const n = this.seats.length
    for (let k = 1; k <= n; k++) {
      const s = this.seats[(from + k) % n]
      if (pred(s)) return s.index
    }
    return null
  }

  private put(s: Seat, amount: Chips) {
    const a = Math.min(amount, s.stack)
    s.stack -= a
    s.bet += a
    s.committed += a
    if (s.stack === 0) s.allIn = true
  }

  private draw(): Card { return this.deck.pop()! }

  /** Starts the next hand: moves the button, posts blinds, deals hole cards. */
  startHand(): void {
    if (this.inHand) throw new Error('Hand in progress')
    if (this.phase === 'closed') throw new Error('Table is closed')
    if (this.human.stack === 0) throw new Error('Out of chips: rebuy or cash out')
    for (const s of this.seats) {
      if (!s.human && s.stack === 0) s.stack = this.botBuyIn // busted bots rebuy
      Object.assign(s, { bet: 0, committed: 0, hole: [], folded: false, allIn: false, acted: false, canRaise: true, lastAction: null })
    }
    this.handNo++
    this.board = []
    this.lastHand = null
    this.deck = shuffle(newDeck(), this.rng)
    this.dealer = (this.dealer + 1) % this.seats.length
    const n = this.seats.length
    const sb = n === 2 ? this.dealer : (this.dealer + 1) % n
    const bb = (sb + 1) % n
    this.phase = 'preflop'
    this.put(this.seats[sb], this.smallBlind)
    this.seats[sb].lastAction = 'SB'
    this.put(this.seats[bb], this.bigBlind)
    this.seats[bb].lastAction = 'BB'
    this.currentBet = this.bigBlind
    this.minRaise = this.bigBlind
    for (let r = 0; r < 2; r++) for (let k = 1; k <= n; k++) this.seats[(this.dealer + k) % n].hole.push(this.draw())
    this.toAct = this.next(bb, (s) => !s.folded && !s.allIn)
    this.advance(false)
  }

  /** Legal options for a seat (defaults to the seat whose turn it is). */
  legalActionsFor(index: number): LegalActions {
    const s = this.seats[index]
    if (!this.inHand || this.toAct !== index) return { fold: false, check: false, call: 0, raise: null }
    const toCall = Math.min(this.currentBet - s.bet, s.stack)
    const maxTo = s.bet + s.stack
    const othersCanAct = this.seats.some((o) => o !== s && !o.folded && !o.allIn)
    let raise: LegalActions['raise'] = null
    if (s.canRaise && maxTo > this.currentBet && othersCanAct) {
      const kind = this.currentBet === 0 ? 'bet' : 'raise'
      const min = kind === 'bet' ? this.bigBlind : this.currentBet + this.minRaise
      raise = { kind, min: Math.min(min, maxTo), max: maxTo }
    }
    return { fold: true, check: toCall === 0, call: toCall, raise }
  }

  /** Legal options for the human player. */
  legalActions(): LegalActions { return this.legalActionsFor(0) }

  /** Human move. */
  act(action: PokerAction): void {
    if (this.toAct !== 0) throw new Error('Not your turn')
    this.apply(0, action)
  }

  /** Lets the bot whose turn it is make one move. Returns what it did, or null if it's not a bot's turn. */
  botStep(): { seat: number; action: PokerAction } | null {
    if (!this.isBotTurn) return null
    const seat = this.toAct!
    const action = this.decide(seat)
    this.apply(seat, action)
    return { seat, action }
  }

  /** Runs bots until it's the human's turn or the hand ends (handy for tests or a "skip animation" button). */
  runBots(): void { while (this.botStep()); }

  private apply(index: number, action: PokerAction) {
    const s = this.seats[index]
    const legal = this.legalActionsFor(index)
    const street = this.phase as Street
    let a = action
    if (a.type === 'allin') a = legal.raise ? { type: legal.raise.kind, to: legal.raise.max } : legal.call > 0 ? { type: 'call' } : { type: 'check' }
    const logAs = action.type === 'allin' ? 'all-in' : a.type
    let amount = 0
    switch (a.type) {
      case 'fold': s.folded = true; break
      case 'check':
        if (!legal.check) throw new Error('Cannot check, there is a bet to call')
        break
      case 'call':
        if (legal.call === 0) throw new Error('Nothing to call')
        amount = legal.call
        this.put(s, amount)
        break
      case 'bet': case 'raise': {
        const r = legal.raise
        if (!r) throw new Error('Raising is not allowed')
        const to = a.to
        if (!Number.isInteger(to) || to > r.max || (to < r.min && to !== r.max)) throw new Error(`Raise must be between ${r.min} and ${r.max}`)
        const size = to - this.currentBet
        amount = to - s.bet
        this.put(s, amount)
        const full = size >= this.minRaise
        for (const o of this.seats) {
          if (o === s || o.folded || o.allIn) continue
          if (!full && o.acted) o.canRaise = false
          o.acted = false
        }
        if (full) { this.minRaise = size; for (const o of this.seats) o.canRaise = true }
        this.currentBet = to
        break
      }
    }
    s.acted = true
    s.lastAction = s.allIn && a.type !== 'fold' && a.type !== 'check' ? 'all-in' : logAs
    this.log.push({ handNo: this.handNo, street, seat: index, action: s.lastAction, amount })
    this.advance(true)
  }

  private roundDone(): boolean {
    const able = this.seats.filter((s) => !s.folded && !s.allIn)
    if (able.length === 0) return true
    if (able.length === 1 && able[0].bet >= this.currentBet) return true
    return able.every((s) => s.acted && s.bet === this.currentBet)
  }

  private advance(moved: boolean) {
    const live = this.seats.filter((s) => !s.folded)
    if (live.length === 1) return this.finish(false)
    if (!this.roundDone()) {
      if (moved || this.toAct === null) {
        this.toAct = this.next(this.toAct ?? this.dealer, (s) => !s.folded && !s.allIn && !(s.acted && s.bet === this.currentBet))
      }
      return
    }
    // close the street
    for (const s of this.seats) { s.bet = 0; s.acted = false; s.canRaise = true }
    this.currentBet = 0
    this.minRaise = this.bigBlind
    if (this.phase === 'river') return this.finish(true)
    this.phase = this.phase === 'preflop' ? 'flop' : this.phase === 'flop' ? 'turn' : 'river'
    this.board.push(...Array.from({ length: this.phase === 'flop' ? 3 : 1 }, () => this.draw()))
    for (const s of this.seats) if (!s.folded && !s.allIn) s.lastAction = null
    this.toAct = null
    this.advance(false)
  }

  private finish(showdown: boolean) {
    this.toAct = null
    const live = this.seats.filter((s) => !s.folded)
    const won: Record<number, Chips> = {}
    const pots: PotWin[] = []
    const shown: HandSummary['shown'] = []
    if (!showdown) {
      const w = live[0]
      won[w.index] = this.pot
      w.stack += this.pot
      pots.push({ amount: this.pot, winners: [w.index], hand: null })
    } else {
      const values = new Map(live.map((s) => [s.index, evaluate([...s.hole, ...this.board])]))
      for (const s of live) shown.push({ seat: s.index, hole: s.hole, hand: values.get(s.index)! })
      for (const pot of buildPots(this.seats)) {
        const best = Math.max(...pot.eligible.map((i) => values.get(i)!.score))
        // odd chips go to the first winner left of the button
        const order = pot.eligible.filter((i) => values.get(i)!.score === best)
          .sort((a, b) => ((a - this.dealer - 1 + 99 * this.seats.length) % this.seats.length) - ((b - this.dealer - 1 + 99 * this.seats.length) % this.seats.length))
        const share = Math.floor(pot.amount / order.length)
        let odd = pot.amount - share * order.length
        for (const i of order) {
          const amt = share + (odd-- > 0 ? 1 : 0)
          this.seats[i].stack += amt
          won[i] = (won[i] ?? 0) + amt
        }
        pots.push({ amount: pot.amount, winners: order, hand: order.length ? values.get(order[0])!.name : null })
      }
    }
    this.lastHand = { handNo: this.handNo, board: [...this.board], pots, won, shown }
    this.phase = 'handOver'
  }

  private decide(index: number): PokerAction {
    const s = this.seats[index]
    const st = STYLE[s.style ?? 'tight']
    const legal = this.legalActionsFor(index)
    const opponents = this.seats.filter((o) => o !== s && !o.folded).length
    const equity = estimateEquity(s.hole, this.board, opponents, this.rng, this.botSims)
    const rel = equity * (opponents + 1) // 1.0 = an average hand at this table size
    const pot = this.pot
    const potOdds = legal.call / (pot + legal.call)
    const raiseTo = (frac: number): PokerAction | null => {
      if (!legal.raise) return null
      const to = this.currentBet + Math.floor(pot * frac)
      return { type: legal.raise.kind, to: Math.max(legal.raise.min, Math.min(legal.raise.max, to)) }
    }
    const r = this.rng.next()
    if (rel >= st.value && r < st.aggro) { const a = raiseTo(0.5 + this.rng.next() * 0.5); if (a) return a }
    if (legal.check) {
      if (this.rng.next() < st.bluff) { const a = raiseTo(0.6); if (a) return a }
      return { type: 'check' }
    }
    if (equity >= potOdds + st.margin) return { type: 'call' }
    if (this.rng.next() < st.bluff / 2) { const a = raiseTo(1); if (a) return a }
    return { type: 'fold' }
  }

  /** Adds chips from the wallet between hands. */
  rebuy(amount: Chips): void {
    if (this.inHand || this.phase === 'closed') throw new Error('Rebuy only between hands')
    this.wallet.debit(amount)
    this.human.stack += amount
    this.totalBuyIn += amount
  }

  /** Leaves the table between hands. Pass the result to wallet.settle(). */
  cashOut(): RoundResult<{ hands: number; stack: Chips; net: Chips }> {
    if (this.inHand) throw new Error('Finish the hand before cashing out')
    if (this.phase === 'closed') throw new Error('Already cashed out')
    this.phase = 'closed'
    const stack = this.human.stack
    return {
      game: 'holdem', roundId: this.id, stake: this.totalBuyIn, payout: stack,
      outcome: { hands: this.handNo, stack, net: stack - this.totalBuyIn },
    }
  }
}
