// `npm run sim` (optionally SIM_SEED=1 SIM_SCALE=5 npm run sim): seeded long runs, measured vs theoretical edge.
import { it } from 'vitest'
import { runAllSims, formatSimTable } from '../src/engine/sim'

it('house-edge simulation', () => {
  const seed = Number(process.env.SIM_SEED ?? 2026), scale = Number(process.env.SIM_SCALE ?? 1)
  const t0 = Date.now()
  const table = formatSimTable(runAllSims(seed, scale))
  console.log(`\nSeed ${seed}, scale ${scale}, ${((Date.now() - t0) / 1000).toFixed(1)} s\n\n${table}\n`)
})
