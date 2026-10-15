// Fails when names in src/ differ only by case, which breaks on case-insensitive
// filesystems (macOS/Windows). Checks:
//  - folder vs folder with the same lowercased path
//  - module vs module: extensions ignored, so `Wheel.tsx` vs `wheel.ts` both
//    answer `import './Wheel'` and are caught. A folder with an index file counts as a module.
import { execSync } from 'node:child_process'

const files = execSync('git ls-files src', { encoding: 'utf8' }).split('\n').filter(Boolean)
const clashes = new Set()
const check = (map, name) => {
  const key = name.toLowerCase(), prev = map.get(key)
  if (prev === undefined) map.set(key, name)
  else if (prev !== name) clashes.add(`${prev}  <->  ${name}`)
}
const dirs = new Map(), modules = new Map()
for (const f of files) {
  const parts = f.split('/')
  for (let i = 1; i < parts.length; i++) check(dirs, parts.slice(0, i).join('/'))
  const mod = f.replace(/(\.test)?\.[^./]+$/, (m) => (m.startsWith('.test') ? '.test' : ''))
  check(modules, mod.replace(/\/index$/, ''))
}
if (clashes.size) {
  console.error('Case-only name clashes (break on case-insensitive filesystems):\n  ' + [...clashes].join('\n  '))
  process.exit(1)
}
console.log(`check-case: ${files.length} files in src/, no case clashes`)
