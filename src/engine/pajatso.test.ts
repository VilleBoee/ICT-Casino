import { describe, it, expect } from 'vitest'
import { playPajatso, pajatsoRtp, pajatsoPath, pajatsoPaytable, PAJATSO_CUPS, PAJATSO_ROWS } from './pajatso'
import { Wallet, STARTING_BALANCE } from './wallet'
import { seededRng } from './rng'

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }

describe('pajatso', () => {
  it('has rows + 1 cups and a paytable', () => {
    expect(PAJATSO_CUPS).toHaveLength(PAJATSO_ROWS + 1)
    expect(pajatsoPaytable()).toEqual([20, 5, 2])
  })
  it('exact RTP is 95%', () => {
    expect(pajatsoRtp()).toBeCloseTo(0.95, 10)
  })
  it('path always ends in the chosen cup', () => {
    const rng = seededRng(3)
    for (let cup = 0; cup <= PAJATSO_ROWS; cup++) for (let i = 0; i < 20; i++) {
      const p = pajatsoPath(cup, rng)
      expect(p).toHaveLength(PAJATSO_ROWS)
      expect(p.filter((s) => s === 'R').length).toBe(cup)
    }
    expect(() => pajatsoPath(PAJATSO_ROWS + 1)).toThrow()
  })
  it('debits first and returns the payout unsettled', () => {
    const w = new Wallet(mem())
    const r = playPajatso(w, 10, seededRng(7))
    expect(w.balance).toBe(STARTING_BALANCE - 10)
    expect(r.outcome.multiplier).toBe(PAJATSO_CUPS[r.outcome.cup].multiplier)
    expect(r.payout).toBe(10 * r.outcome.multiplier)
    expect(() => playPajatso(w, 0)).toThrow()
  })
  it('simulated RTP is about 95%', () => {
    const rng = seededRng(99)
    const w = { debit: () => {} } as unknown as Wallet
    let staked = 0, returned = 0
    for (let i = 0; i < 200_000; i++) {
      const r = playPajatso(w, 10, rng)
      staked += r.stake; returned += r.payout
    }
    expect(Math.abs(returned / staked - 0.95)).toBeLessThan(0.01)
  })
})
