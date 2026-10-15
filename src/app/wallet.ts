import { useSyncExternalStore } from 'react'
import { Wallet, type WalletState } from '../engine'

const memory = (): Pick<Storage, 'getItem' | 'setItem'> => {
  const m = new Map<string, string>()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }
}
const storage = (() => {
  try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return localStorage } catch { return memory() }
})()

/** App-wide wallet singleton, persisted in localStorage. */
export const wallet = new Wallet(storage)

/** Live wallet state; re-renders whenever the wallet changes. */
export function useWallet(): WalletState & { wallet: Wallet; canRefill: boolean } {
  const state = useSyncExternalStore((cb) => wallet.subscribe(cb), () => wallet.snapshot)
  return { ...state, wallet, canRefill: wallet.canRefill() }
}
