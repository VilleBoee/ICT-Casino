// Generates the game's original sound effects (own work, CC0) into public/sfx as .ogg + .mp3.
// Pure synthesis, no samples: node scripts/gen-sfx.mjs   (needs ffmpeg on PATH)
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const SR = 22050
const OUT = 'public/sfx'
mkdirSync(OUT, { recursive: true })

// deterministic noise so regenerating gives identical files
let seed = 1337
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32) * 2 - 1
const buf = (sec) => new Float32Array(Math.ceil(sec * SR))
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d))
const add = (b, start, fn, len) => {
  const s0 = Math.floor(start * SR)
  for (let i = 0; i < len * SR && s0 + i < b.length; i++) b[s0 + i] += fn(i / SR)
}
const sine = (f) => (t) => Math.sin(2 * Math.PI * f * t)
const square = (f) => (t) => (Math.sin(2 * Math.PI * f * t) >= 0 ? 1 : -1)
/** one-pole low-pass over a generator */
const lowpassNoise = (alpha) => { let y = 0; return () => (y += alpha * (rnd() - y)) }

const S = {
  chip: () => {
    const b = buf(0.12)
    add(b, 0, (t) => 0.5 * rnd() * env(t, 0.001, 0.008), 0.05)
    add(b, 0, (t) => 0.35 * sine(3200)(t) * env(t, 0.001, 0.02) + 0.25 * sine(4700)(t) * env(t, 0.001, 0.015), 0.12)
    add(b, 0.035, (t) => 0.2 * sine(3600)(t) * env(t, 0.001, 0.015), 0.08)
    return b
  },
  deal: () => {
    const b = buf(0.16), n = lowpassNoise(0.35)
    add(b, 0, (t) => 0.7 * n() * Math.sin(Math.PI * Math.min(1, t / 0.14)), 0.14)
    return b
  },
  flip: () => {
    const b = buf(0.1), n = lowpassNoise(0.6)
    add(b, 0, (t) => 0.6 * n() * env(t, 0.002, 0.015), 0.06)
    add(b, 0, (t) => 0.3 * sine(900)(t) * env(t, 0.001, 0.02), 0.08)
    return b
  },
  spin: () => {
    // ball rattling around the wheel, slowing down
    const b = buf(2.6), n = lowpassNoise(0.2)
    add(b, 0, (t) => 0.12 * n() * env(t, 0.2, 1.2), 2.6)
    let t = 0, gap = 0.035
    while (t < 2.4) { add(b, t, (u) => 0.35 * rnd() * env(u, 0.0005, 0.004), 0.02); t += gap; gap *= 1.045 }
    return b
  },
  ball: () => {
    const b = buf(0.6)
    ;[0, 0.14, 0.24, 0.31, 0.36].forEach((t0, i) => {
      const a = 0.6 * 0.65 ** i
      add(b, t0, (u) => a * (0.6 * rnd() * env(u, 0.0005, 0.005) + sine(1800 - i * 120)(u) * env(u, 0.0005, 0.02)), 0.08)
    })
    return b
  },
  reel: () => {
    const b = buf(0.18)
    add(b, 0, (t) => 0.7 * sine(110 * Math.exp(-t * 8))(t) * env(t, 0.002, 0.05), 0.18)
    add(b, 0, (t) => 0.4 * rnd() * env(t, 0.0005, 0.006), 0.03)
    return b
  },
  win: () => {
    const b = buf(0.9)
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      add(b, i * 0.09, (t) => 0.18 * (square(f)(t) * 0.5 + sine(f)(t)) * env(t, 0.005, i === 3 ? 0.35 : 0.12), 0.6)
    })
    return b
  },
  lose: () => {
    const b = buf(0.55)
    add(b, 0, (t) => 0.25 * sine(392 * (1 - t * 0.15))(t) * env(t, 0.005, 0.12), 0.25)
    add(b, 0.18, (t) => 0.25 * sine(277 * (1 - t * 0.2))(t) * env(t, 0.005, 0.2), 0.37)
    return b
  },
  boom: () => {
    const b = buf(1.0), n = lowpassNoise(0.08)
    add(b, 0, (t) => 1.6 * n() * env(t, 0.003, 0.25), 1.0)
    add(b, 0, (t) => 0.6 * sine(60 * Math.exp(-t * 3))(t) * env(t, 0.003, 0.3), 1.0)
    return b
  },
  tick: () => {
    const b = buf(0.04)
    add(b, 0, (t) => 0.35 * sine(1500)(t) * env(t, 0.0005, 0.008), 0.04)
    return b
  },
}

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2)
  let peak = 0
  for (const s of samples) peak = Math.max(peak, Math.abs(s))
  const g = peak > 0.95 ? 0.95 / peak : 1
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s * g)) * 32767), i * 2))
  const h = Buffer.alloc(44)
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVEfmt ', 8)
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24)
  h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40)
  return Buffer.concat([h, data])
}

for (const [name, make] of Object.entries(S)) {
  const tmp = join(OUT, `${name}.wav`)
  writeFileSync(tmp, wav(make()))
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', '-q:a', '2', join(OUT, `${name}.ogg`)])
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libmp3lame', '-b:a', '48k', join(OUT, `${name}.mp3`)])
  rmSync(tmp)
}
console.log('generated', Object.keys(S).join(', '))
