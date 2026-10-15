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
    // soft, short two-note chime: pure sines with a gentle attack (was a 4-note square-wave arpeggio, #74)
    const b = buf(0.45)
    ;[659.25, 987.77].forEach((f, i) => {
      add(b, i * 0.08, (t) => 0.12 * (sine(f)(t) + 0.25 * sine(f * 2)(t)) * env(t, 0.012, i === 1 ? 0.14 : 0.07), 0.37)
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

// Loudness targets (EBU R128 integrated, LUFS). Everything sits at -24; the win jingle is deliberately quieter (#74).
const TARGET = { default: -24, win: -28 }
const PEAK_CEIL = -3 // dBFS

/** Integrated loudness and sample peak of a file. Short clips are padded with silence (gated out) so they get a reading. */
function loudness(file) {
  const out = execFileSync('sh', ['-c', `ffmpeg -nostats -i "${file}" -af "apad=pad_dur=1,ebur128=peak=sample" -f null - 2>&1`], { encoding: 'utf8' })
  const summary = out.slice(out.lastIndexOf('Summary:'))
  return { I: Number(summary.match(/I:\s+(-?[\d.]+) LUFS/)[1]), peak: Number(summary.match(/Peak:\s+(-?[\d.]+) dBFS/)[1]) }
}

for (const [name, make] of Object.entries(S)) {
  const tmp = join(OUT, `${name}.wav`), norm = join(OUT, `${name}.norm.wav`)
  writeFileSync(tmp, wav(make()))
  // normalise: one fixed gain to the target, but never above the peak ceiling
  const { I, peak } = loudness(tmp)
  const target = TARGET[name] ?? TARGET.default
  const gain = Math.min(target - I, PEAK_CEIL - peak)
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-af', `volume=${gain.toFixed(2)}dB`, norm])
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', norm, '-c:a', 'libvorbis', '-q:a', '2', join(OUT, `${name}.ogg`)])
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', norm, '-c:a', 'libmp3lame', '-b:a', '48k', join(OUT, `${name}.mp3`)])
  rmSync(tmp); rmSync(norm)
  console.log(`${name.padEnd(5)} ${I.toFixed(1)} LUFS -> ${(I + gain).toFixed(1)} (gain ${gain.toFixed(1)} dB)`)
}
console.log('generated', Object.keys(S).join(', '))
