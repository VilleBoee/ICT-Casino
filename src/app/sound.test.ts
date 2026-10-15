import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k),
})
const played: { src: string; volume?: number }[] = []
vi.mock('howler', () => ({
  Howl: class {
    src: string
    constructor(o: { src: string[] }) { this.src = o.src[0] }
    play() { played.push({ src: this.src }); return 1 }
    stop() {} rate() {}
    volume(v: number) { played.at(-1)!.volume = v }
  },
}))

const { __resetSound, play, setMuted, SFX_LEVEL, gainFor } = await import('./sound')
const { settings } = await import('./settings')
const { DEFAULT_VOLUME, SETTINGS_KEY } = await import('../engine')
const flush = () => new Promise((r) => setTimeout(r, 0))

describe('sound service', () => {
  beforeEach(() => { played.length = 0; settings.update({ muted: false, volume: DEFAULT_VOLUME }) })

  it('is silent before the first interaction (autoplay policy)', async () => {
    __resetSound()
    play('win'); await flush()
    expect(played).toEqual([])
  })
  it('stays silent when muted in the settings store, and the mute is persisted there', async () => {
    __resetSound({ unlocked: true })
    setMuted(true)
    expect(JSON.parse(store.get(SETTINGS_KEY)!).muted).toBe(true)
    play('chip'); await flush()
    expect(played).toEqual([])
  })
  it('plays at master volume x per-sound level', async () => {
    __resetSound({ unlocked: true })
    play('reel'); await flush()
    expect(played.at(-1)!.src).toMatch(/sfx\/reel\.ogg$/)
    expect(played.at(-1)!.volume).toBeCloseTo(DEFAULT_VOLUME * SFX_LEVEL.reel)
    settings.setVolume(1)
    expect(gainFor('win')).toBeCloseTo(SFX_LEVEL.win)
    expect(gainFor('win', 0.5)).toBeCloseTo(SFX_LEVEL.win * 0.5)
  })
  it('defaults are about 0.4x the old fixed 0.7 level, and the win sound is the quietest', () => {
    expect(gainFor('chip') / 0.7).toBeCloseTo(0.4, 1)
    const levels = Object.entries(SFX_LEVEL)
    expect(Math.min(...levels.filter(([k]) => k !== 'tick').map(([, v]) => v))).toBe(SFX_LEVEL.win)
  })
})
