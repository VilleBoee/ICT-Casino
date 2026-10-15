import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k),
})
const played: string[] = []
vi.mock('howler', () => ({
  Howl: class { src: string; constructor(o: { src: string[] }) { this.src = o.src[0] } play() { played.push(this.src); return 1 } stop() {} rate() {} volume() {} },
}))

const { MUTE_KEY, __resetSound, play, setMuted } = await import('./sound')
const flush = () => new Promise((r) => setTimeout(r, 0))

describe('sound service', () => {
  beforeEach(() => { store.clear(); played.length = 0 })

  it('is silent before the first interaction (autoplay policy)', async () => {
    __resetSound()
    play('win'); await flush()
    expect(played).toEqual([])
  })
  it('stays muted when the user chose mute, and remembers it', async () => {
    store.set(MUTE_KEY, '1')
    __resetSound({ unlocked: true })
    play('chip'); await flush()
    expect(played).toEqual([])
  })
  it('plays after unlock when unmuted, and persists the toggle', async () => {
    __resetSound({ unlocked: true, muted: false })
    play('reel'); await flush()
    expect(played.at(-1)).toMatch(/sfx\/reel\.ogg$/)
    setMuted(true)
    expect(store.get(MUTE_KEY)).toBe('1')
    play('reel'); await flush()
    expect(played).toHaveLength(1)
  })
})
