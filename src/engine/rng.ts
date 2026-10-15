export interface Rng {
  /** Float in [0, 1) */
  next(): number
  /** Integer in [0, max) */
  int(max: number): number
}

function makeRng(next: () => number): Rng {
  return { next, int: (max) => Math.floor(next() * max) }
}

/** Cryptographically strong RNG for real play. */
export const cryptoRng: Rng = makeRng(() => {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 0x1_0000_0000
})

/** Deterministic RNG (mulberry32) for tests and replays. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return makeRng(() => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 0x1_0000_0000
  })
}

/** Fisher-Yates shuffle, returns a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng = cryptoRng): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
