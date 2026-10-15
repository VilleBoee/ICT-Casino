import { colors, type ColorToken } from './theme/tokens'

const swatches: ColorToken[] = ['bg', 'surface', 'surface-2', 'border', 'fg', 'muted', 'neon', 'cyan', 'win', 'lose', 'warn']

/** Temporary theme preview (#7) — replaced by the app shell (#9). */
function App() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <header className="space-y-2">
        <p className="font-mono text-sm text-muted">
          <span className="text-neon">ville@ict</span>:<span className="text-cyan">~/casino</span>$ npm run theme
        </p>
        <h1>
          ICT<span className="text-neon text-glow">_</span>Casino
        </h1>
        <p className="max-w-prose text-muted">
          Theme preview. Dark, terminal-inspired, professional. Body text is Inter; headings and numbers are JetBrains Mono.
        </p>
      </header>

      <section className="panel space-y-4" aria-labelledby="colors">
        <h2 id="colors">Colours</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {swatches.map((name) => (
            <li key={name} className="space-y-1">
              <div className="h-12 rounded-md border border-border" style={{ background: colors[name] }} />
              <p className="font-mono text-xs text-fg">{name}</p>
              <p className="font-mono text-xs text-muted">{colors[name]}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="panel space-y-3" aria-labelledby="type">
          <h2 id="type">Typography</h2>
          <h3>Heading 3 — Roulette</h3>
          <p>Body text in Inter for readable descriptions and rules.</p>
          <p className="text-muted">Muted secondary text for hints.</p>
          <p className="num text-3xl text-neon text-glow">1 337 chips</p>
          <p className="font-mono text-sm">
            <span className="text-win">+350 WIN</span> · <span className="text-lose">-50 LOSE</span> ·{' '}
            <span className="text-warn">LOW BALANCE</span>
          </p>
        </section>

        <section className="panel space-y-4" aria-labelledby="buttons">
          <h2 id="buttons">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-primary">Spin</button>
            <button type="button" className="btn-secondary">Deal</button>
            <button type="button" className="btn-ghost">Stand</button>
            <button type="button" className="btn-primary" disabled>Disabled</button>
          </div>
          <div className="rounded-md border border-border bg-surface-2 p-4 shadow-glow-cyan">
            <p className="font-mono text-sm text-cyan">// raised surface with cyan glow</p>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
