import { describe, it, expect } from 'vitest'
import { evaluate, compareHands } from './poker'
import { HoldemTable, buildPots, estimateEquity, type Seat } from './holdem'
import { Wallet, STARTING_BALANCE } from './wallet'
import { seededRng } from './rng'
import type { Card, Rank, Suit } from './types'

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }
const RANK: Record<string, Rank> = { T: 10, J: 11, Q: 12, K: 13, A: 14 }
/** "As Kd 2c" -> cards */
const h = (s: string): Card[] => s.split(' ').map((t) => ({ rank: (RANK[t[0]] ?? Number(t[0])) as Rank, suit: t[1].toUpperCase() as Suit }))
const ev = (s: string) => evaluate(h(s))
const total = (t: HoldemTable) => t.seats.reduce((a, s) => a + s.stack, 0)

describe('hand evaluator', () => {
  it.each([
    ['As Ks Qs Js Ts 2d 3c', 'Royal Flush'],
    ['9h 8h 7h 6h 5h Ad Ac', 'Straight Flush'],
    ['5d 5c 5h 5s Kd 2c 3c', 'Four of a Kind'],
    ['Kd Kc Kh 2s 2d 9c 3c', 'Full House'],
    ['2h 7h 9h Jh Kh Ad Ac', 'Flush'],
    ['Ad 2c 3h 4s 5d Kc Kh', 'Straight'],
    ['7d 7c 7h As Kd 2c 3c', 'Three of a Kind'],
    ['7d 7c 2h 2s Kd Ac 3c', 'Two Pair'],
    ['7d 7c 2h 9s Kd Ac 3c', 'One Pair'],
    ['7d 8c 2h 9s Kd Ac 3c', 'High Card'],
  ])('%s is %s', (cards, name) => expect(ev(cards).name).toBe(name))

  it('wheel is the lowest straight', () => {
    expect(ev('Ad 2c 3h 4s 5d 9c 9h').ranks[0]).toBe(5)
    expect(compareHands(h('2d 3c 4h 5s 6d'), h('Ad 2c 3h 4s 5d'))).toBeGreaterThan(0)
  })
  it('two trips make a full house with the higher trips', () => {
    expect(ev('Kd Kc Kh 2s 2d 2c 3c')).toMatchObject({ name: 'Full House', ranks: [13, 2] })
  })
  it('three pairs uses the best two plus best kicker', () => {
    expect(ev('Kd Kc 9h 9s 4d 4c Qc').ranks).toEqual([13, 9, 12])
  })
  it('kickers decide equal pairs', () => {
    expect(compareHands(h('Ad Ac Kh 7s 2d'), h('Ah As Qh Js Td'))).toBeGreaterThan(0)
    expect(compareHands(h('Ad Ac Kh 7s 3d'), h('Ah As Kc 7d 2d'))).toBeGreaterThan(0)
    expect(compareHands(h('Ad Ac Kh 7s 3d'), h('Ah As Kc 7d 3h'))).toBe(0)
  })
  it('quads kicker and flush ranking', () => {
    expect(compareHands(h('9d 9c 9h 9s Ad'), h('9d 9c 9h 9s Kd'))).toBeGreaterThan(0)
    expect(compareHands(h('Ah 9h 7h 4h 3h'), h('Kh Qh Jh 9h 8h'))).toBeGreaterThan(0)
  })
  it('categories are strictly ordered', () => {
    const order = ['7d 8c 2h 9s Kd', '7d 7c 2h 9s Kd', '7d 7c 2h 2s Kd', '7d 7c 7h 2s Kd', '6d 7c 8h 9s Td',
      '2h 7h 9h Jh Kh', '7d 7c 7h 2s 2d', '7d 7c 7h 7s 2d', '6h 7h 8h 9h Th']
    const scores = order.map((x) => ev(x).score)
    expect([...scores].sort((a, b) => a - b)).toEqual(scores)
  })
  it('rejects bad sizes', () => expect(() => evaluate(h('2d 3d'))).toThrow())
})

describe('side pots', () => {
  const seat = (index: number, committed: number, folded = false) => ({ index, committed, folded })
  it('builds main and side pots', () => {
    const pots = buildPots([seat(0, 100), seat(1, 300), seat(2, 300), seat(3, 50, true)])
    expect(pots).toEqual([{ amount: 350, eligible: [0, 1, 2] }, { amount: 400, eligible: [1, 2] }])
  })
  it('folded chips above live levels stay in the pot', () => {
    expect(buildPots([seat(0, 100), seat(1, 100), seat(2, 400, true)])).toEqual([{ amount: 600, eligible: [0, 1] }])
  })
  it('an uncalled excess returns to its owner', () => {
    expect(buildPots([seat(0, 50), seat(1, 200)])).toEqual([{ amount: 100, eligible: [0, 1] }, { amount: 150, eligible: [1] }])
  })
})

describe('equity', () => {
  it('aces beat a random hand most of the time', () => {
    expect(estimateEquity(h('As Ah'), [], 1, seededRng(1), 2000)).toBeGreaterThan(0.8)
    expect(estimateEquity(h('7c 2d'), [], 1, seededRng(1), 2000)).toBeLessThan(0.4)
  })
  it('the nuts on the river is 100%', () => {
    expect(estimateEquity(h('As Ks'), h('Qs Js Ts 2d 3c'), 4, seededRng(2), 200)).toBe(1)
  })
})

describe('holdem table', () => {
  const table = (seed = 1, bots = 5, buyIn = 600) => {
    const w = new Wallet(mem(), () => 0)
    return { w, t: new HoldemTable(w, { buyIn, bots, rng: seededRng(seed), botSims: 40 }) }
  }

  it('debits buy-in and validates config', () => {
    const { w, t } = table()
    expect(w.balance).toBe(STARTING_BALANCE - 600)
    expect(t.seats).toHaveLength(6)
    expect(t.seats.filter((s) => s.style).map((s) => s.style)).toEqual(['tight', 'loose', 'bluffer', 'tight', 'loose'])
    const w2 = new Wallet(mem(), () => 0)
    expect(() => new HoldemTable(w2, { buyIn: 500, bots: 4 })).toThrow()
    expect(() => new HoldemTable(w2, { buyIn: 500, bots: 9 })).toThrow()
    expect(() => new HoldemTable(w2, { buyIn: 5000 })).toThrow('Insufficient')
    expect(new HoldemTable(w2, { buyIn: 500, bots: 8 }).seats).toHaveLength(9)
  })

  it('posts blinds, deals, and acts left of the big blind', () => {
    const { t } = table()
    t.startHand()
    expect(t.dealer).toBe(0)
    expect(t.seats[1].bet).toBe(10)
    expect(t.seats[2].bet).toBe(20)
    expect(t.seats.every((s) => s.hole.length === 2)).toBe(true)
    expect(t.toAct).toBe(3)
    expect(t.phase).toBe('preflop')
  })

  it('min-raise rules for the human', () => {
    const { t } = table()
    t.startHand()
    // force bots to just call to the human
    while (t.isBotTurn) t['apply'](t.toAct!, { type: 'call' })
    const legal = t.legalActions()
    expect(legal).toMatchObject({ fold: true, check: false, call: 20, raise: { kind: 'raise', min: 40, max: 600 } })
    expect(() => t.act({ type: 'raise', to: 30 })).toThrow()
    expect(() => t.act({ type: 'check' })).toThrow()
    t.act({ type: 'raise', to: 100 })
    expect(t.currentBet).toBe(100)
    expect(t.minRaise).toBe(80)
    t['apply'](t.toAct!, { type: 'raise', to: 180 }) // seat 1 raises by 80
    expect(t.legalActionsFor(t.toAct!).raise?.min).toBe(260)
  })

  it('everyone folding to the big blind awards the pot', () => {
    const { t } = table()
    t.startHand()
    while (t.inHand) t['apply'](t.toAct!, { type: 'fold' })
    expect(t.phase).toBe('handOver')
    expect(t.lastHand!.won).toEqual({ 2: 30 })
    expect(t.seats[2].stack).toBe(610)
    expect(t.seats[1].stack).toBe(590)
  })

  it('checks through all streets to a showdown', () => {
    const { t } = table(3)
    t.startHand()
    while (t.inHand) {
      const l = t.legalActionsFor(t.toAct!)
      t['apply'](t.toAct!, l.check ? { type: 'check' } : { type: 'call' })
      if (t.inHand) expect(t.board.length).toBe({ preflop: 0, flop: 3, turn: 4, river: 5 }[t.phase as 'flop'])
    }
    expect(t.board).toHaveLength(5)
    expect(t.lastHand!.shown).toHaveLength(6)
    expect(Object.values(t.lastHand!.won).reduce((a, b) => a + b, 0)).toBe(120)
    expect(total(t)).toBe(3600)
  })

  it('all-in runs out the board and pays side pots', () => {
    const { t } = table(4)
    t.startHand()
    // give seat 3 a short stack
    t.seats[3].stack = 100
    t['apply'](3, { type: 'allin' })
    expect(t.seats[3].allIn).toBe(true)
    t['apply'](4, { type: 'allin' })
    for (const i of [5, 0, 1]) t['apply'](i, { type: 'fold' })
    t['apply'](2, { type: 'call' })
    expect(t.phase).toBe('handOver')
    expect(t.board).toHaveLength(5)
    const pots = t.lastHand!.pots
    expect(pots[0]).toMatchObject({ amount: 100 * 3 + 10 })
    expect(pots.reduce((a, p) => a + p.amount, 0)).toBe(10 + 600 + 100 + 600)
  })

  it('short all-in raise does not reopen raising for seats that acted', () => {
    const { t } = table(5)
    t.startHand()
    t['apply'](3, { type: 'raise', to: 100 }) // raise by 80
    t.seats[4].stack = 130 // can go to 130 total, only +30
    t['apply'](4, { type: 'allin' })
    expect(t.currentBet).toBe(130)
    for (const i of [5, 0, 1, 2]) t['apply'](i, { type: 'fold' })
    expect(t.toAct).toBe(3)
    const l = t.legalActionsFor(3)
    expect(l.call).toBe(30)
    expect(l.raise).toBeNull()
  })

  it('split pots divide evenly when the board plays', () => {
    const { t } = table(6)
    t.startHand()
    // rig a board-plays split
    t['deck'] = h('As Ks Qs Js Ts').reverse()
    for (const s of t.seats) s.hole = h(`${['4d', '5h', '6h', '7h', '8h', '9h'][s.index]} ${['5d', '5s', '6s', '7s', '8s', '9s'][s.index]}`)
    for (const i of [3, 4, 5, 0]) t['apply'](i, { type: 'fold' })
    t['apply'](1, { type: 'call' })
    t['apply'](2, { type: 'check' })
    while (t.inHand) t['apply'](t.toAct!, { type: 'check' })
    expect(t.lastHand!.pots[0]).toMatchObject({ amount: 40, winners: [1, 2], hand: 'Royal Flush' })
    expect(t.lastHand!.won).toEqual({ 1: 20, 2: 20 })
  })

  it('bots play many hands without breaking chip conservation', () => {
    const { w, t } = table(7, 8)
    const actions = new Set<string>()
    for (let n = 0; n < 60; n++) {
      if (t.human.stack === 0) { if (w.balance < 200) break; t.rebuy(200) }
      t.startHand()
      while (t.inHand) {
        if (t.isHumanTurn) {
          const l = t.legalActions()
          t.act(l.check ? { type: 'check' } : l.call <= 40 ? { type: 'call' } : { type: 'fold' })
        } else {
          const step = t.botStep()!
          actions.add(step.action.type)
        }
        expect(t.seats.every((s: Seat) => s.stack >= 0)).toBe(true)
      }
      const bots = t.seats.slice(1).reduce((a, s) => a + s.stack, 0)
      expect(Number.isInteger(bots)).toBe(true)
    }
    expect(actions).toEqual(new Set(['fold', 'call', 'check', 'raise', 'bet']))
  })

  it('bot styles differ in how often they play', () => {
    const vpip: Record<string, number> = { tight: 0, loose: 0, bluffer: 0 }
    const { t } = table(8, 5, 900)
    for (let n = 0; n < 60; n++) {
      t.startHand()
      const played = new Set<number>()
      while (t.inHand) {
        if (t.isHumanTurn) { t.act({ type: 'fold' }); continue }
        const pre = t.phase === 'preflop'
        const s = t.botStep()!
        if (pre && s.action.type !== 'fold' && s.action.type !== 'check') played.add(s.seat)
      }
      played.forEach((i) => vpip[t.seats[i].style!]++)
    }
    expect(vpip.loose).toBeGreaterThan(vpip.tight)
  })

  it('cash-out settles the stack back, only between hands', () => {
    const { w, t } = table()
    t.startHand()
    expect(() => t.cashOut()).toThrow()
    t.runBots()
    while (t.inHand) { t.act({ type: 'fold' }); t.runBots() }
    t.rebuy(100)
    expect(w.balance).toBe(STARTING_BALANCE - 700)
    const res = t.cashOut()
    expect(res).toMatchObject({ game: 'holdem', stake: 700, payout: t.human.stack })
    w.settle(res)
    expect(w.balance).toBe(STARTING_BALANCE - 700 + t.human.stack)
    expect(() => t.startHand()).toThrow()
    expect(() => t.cashOut()).toThrow()
  })

  it('is deterministic with a seeded rng', () => {
    const play = () => { const { t } = table(42); for (let i = 0; i < 5; i++) { t.startHand(); while (t.inHand) { if (t.isHumanTurn) t.act({ type: 'fold' }); else t.botStep() } } return t.seats.map((s) => s.stack) }
    expect(play()).toEqual(play())
  })

  it('1000 seeded hands: bots stay legal and chips are conserved every hand', () => {
    const w = new Wallet(mem(), () => 0)
    w.settle({ game: 'holdem', stake: 0, payout: 1_000_000 })
    const t = new HoldemTable(w, { buyIn: 600, bots: 5, rng: seededRng(1000), botSims: 12, blindSchedule: { everyHands: 100, factor: 1.5 } })
    for (let n = 0; n < 1000; n++) {
      if (t.human.stack === 0) t.rebuy(600)
      // bots that busted are topped up at startHand; count chips after that
      t.startHand()
      const before = t.seats.reduce((a, s) => a + s.stack + s.committed, 0)
      while (t.inHand) {
        if (t.isHumanTurn) {
          const l = t.legalActions()
          t.act(l.check ? { type: 'check' } : l.call <= t.bigBlind * 2 ? { type: 'call' } : { type: 'fold' })
        } else {
          const seat = t.toAct!
          const legal = t.legalActionsFor(seat)
          const { action } = t.botStep()!
          if (action.type === 'check') expect(legal.check).toBe(true)
          if (action.type === 'call') expect(legal.call).toBeGreaterThan(0)
          if (action.type === 'bet' || action.type === 'raise') {
            expect(legal.raise?.kind).toBe(action.type)
            expect(action.to).toBeGreaterThanOrEqual(legal.raise!.min)
            expect(action.to).toBeLessThanOrEqual(legal.raise!.max)
          }
        }
      }
      expect(t.seats.reduce((a, s) => a + s.stack, 0)).toBe(before)
      expect(t.seats.every((s) => Number.isInteger(s.stack) && s.stack >= 0)).toBe(true)
    }
    expect(t.handNo).toBe(1000)
    expect(t.bigBlind).toBeGreaterThan(20)
  }, 120_000)

  it('three all-ins of different sizes build correct side pots and pay each one', () => {
    const { t } = table(9)
    t.startHand() // dealer 0, SB 1, BB 2, first to act 3
    t.seats[3].stack = 100; t.seats[4].stack = 250; t.seats[5].stack = 400
    // rig the showdown: seat 3 best, seat 4 second, seat 5 third, BB worst
    t['deck'] = h('2c 7d 9h Js 3s').reverse()
    t.seats[3].hole = h('Ah Ad'); t.seats[4].hole = h('Kh Kd'); t.seats[5].hole = h('Qh Qd'); t.seats[2].hole = h('4c 5d')
    t['apply'](3, { type: 'allin' })
    t['apply'](4, { type: 'allin' })
    t['apply'](5, { type: 'allin' })
    t['apply'](0, { type: 'fold' })
    t['apply'](1, { type: 'fold' })
    t['apply'](2, { type: 'allin' }) // BB has 580 behind but nobody can call more, so this is a call to 400
    expect(t.phase).toBe('handOver')
    const pots = t.lastHand!.pots
    expect(pots.map((p) => p.amount)).toEqual([410, 450, 300])
    expect(pots.map((p) => p.winners)).toEqual([[3], [4], [5]])
    expect(t.lastHand!.won).toEqual({ 3: 410, 4: 450, 5: 300 })
    expect(t.seats[2].stack).toBe(200)
    expect(total(t)).toBe(600 * 3 + 100 + 250 + 400)
  })

  it('increasing blinds on a schedule and via setBlinds', () => {
    const w = new Wallet(mem(), () => 0)
    const t = new HoldemTable(w, { buyIn: 600, rng: seededRng(3), botSims: 10, blindSchedule: { everyHands: 2, factor: 2 } })
    const play = () => { t.startHand(); while (t.inHand) { if (t.isHumanTurn) t.act({ type: 'fold' }); else t.botStep() } }
    play(); play()
    expect(t.bigBlind).toBe(20)
    play()
    expect([t.smallBlind, t.bigBlind]).toEqual([20, 40])
    expect(() => { t.startHand(); t.setBlinds(50, 100) }).toThrow()
    while (t.inHand) { if (t.isHumanTurn) t.act({ type: 'fold' }); else t.botStep() }
    t.blindSchedule = null
    t.setBlinds(50, 100)
    t.startHand()
    expect(t.currentBet).toBe(100)
    expect(() => t.setBlinds(0, 10)).toThrow()
  })

  it('exposes a HoldemState snapshot and a configurable bot delay', () => {
    const w = new Wallet(mem(), () => 0)
    const t = new HoldemTable(w, { buyIn: 600, rng: seededRng(4), botSims: 10, botDelayMs: 250 })
    t.startHand()
    const s = t.getState()
    expect(s).toMatchObject({ handNo: 1, phase: 'preflop', toAct: 3, isHumanTurn: false, botDelayMs: 250, pot: 30, smallBlind: 10, bigBlind: 20 })
    expect(s.seats).toHaveLength(6)
    expect(s.legal.fold).toBe(false)
    ;(s.seats[0] as Seat).stack = -1
    expect(t.human.stack).toBe(600) // snapshot is a copy
    t.botDelayMs = 0
    t.runBots()
    if (t.isHumanTurn) expect(t.getState()).toMatchObject({ botDelayMs: 0, isHumanTurn: true, legal: { fold: true } })
    expect(() => new HoldemTable(w, { buyIn: 200, botDelayMs: -1 })).toThrow()
  })
})
