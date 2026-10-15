# Theme

Dark, terminal/IDE-inspired theme. Tokens are defined once in `src/index.css` (`@theme`, Tailwind v4)
and mirrored in `tokens.ts` for use in JS (e.g. Framer Motion, canvas).

| Token | Hex | Tailwind | Use | Contrast on bg |
|---|---|---|---|---|
| bg | #07090a | `bg-bg` | page | – |
| surface | #0d1214 | `bg-surface` | panels | – |
| surface-2 | #141b1e | `bg-surface-2` | raised/hover | – |
| border | #24303a | `border-border` | hairlines | decorative |
| fg | #e6edf3 | `text-fg` | primary text | ~17:1 |
| muted | #93a1ad | `text-muted` | secondary text | ~7.5:1 |
| neon | #39ff88 | `text-neon` / `bg-neon` | primary accent | ~15:1 |
| cyan | #22d3ee | `text-cyan` | secondary accent | ~11:1 |
| win / lose / warn | #4ade80 / #f87171 / #fbbf24 | `text-win` … | results | ≥7:1 |

Buttons on `bg-neon` / `bg-cyan` use `text-bg` (≥11:1). All text pairs meet WCAG AA.

**Fonts** (self-hosted via @fontsource, no CDN): `font-mono` JetBrains Mono for headings & numbers,
`font-sans` Inter for body.

**Shadows**: `shadow-glow-neon`, `shadow-glow-cyan`, `shadow-panel`.

**Utilities / components** (index.css, Tailwind v4 `@utility`): `.panel`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`,
`.num` (tabular mono numbers), `.text-glow`. Background grid is on `body`; scanlines are a fixed
`body::after` overlay — the flicker animation is disabled under `prefers-reduced-motion`.
Focus: 2px neon `:focus-visible` outline on all interactive elements.
