/**
 * ICT Casino design tokens. Mirrors the `@theme` block in src/index.css,
 * which is the source of truth for Tailwind utilities (bg-*, text-*, font-*, shadow-*).
 * Contrast ratios are against `bg` (#07090a); all body/UI text pairs meet WCAG AA (>= 4.5:1).
 */
export const colors = {
  bg: '#07090a', // page background
  surface: '#0d1214', // panels / cards
  'surface-2': '#141b1e', // raised / hover
  border: '#24303a', // hairlines (decorative only)
  fg: '#e6edf3', // primary text   ~17:1
  muted: '#93a1ad', // secondary text ~7.5:1 (6.9:1 on surface-2)
  neon: '#39ff88', // primary accent  ~15:1
  cyan: '#22d3ee', // secondary accent ~11:1
  win: '#4ade80', // win             ~11:1
  lose: '#f87171', // lose            ~7:1
  warn: '#fbbf24', // warning         ~11:1
} as const

export const fonts = {
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace', // headings, numbers, chips
  sans: 'Inter, ui-sans-serif, system-ui, sans-serif', // body
} as const

export const shadows = {
  'glow-neon': '0 0 0 1px rgb(57 255 136 / .35), 0 0 18px rgb(57 255 136 / .25)',
  'glow-cyan': '0 0 0 1px rgb(34 211 238 / .35), 0 0 18px rgb(34 211 238 / .25)',
  panel: '0 1px 0 rgb(255 255 255 / .03) inset, 0 8px 24px rgb(0 0 0 / .45)',
} as const

export type ColorToken = keyof typeof colors
