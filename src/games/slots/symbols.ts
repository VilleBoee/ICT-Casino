import { PAYLINES, ROWS, SLOT_SYMBOLS, type LineWin, type SlotSymbol } from '../../engine/slots'

export const SYMBOL_UI: Record<SlotSymbol, { glyph: string; label: string; color: string }> = {
  bug: { glyph: '🐞', label: 'Bug', color: '#f87171' },
  coffee: { glyph: '☕', label: 'Coffee', color: '#fbbf24' },
  git: { glyph: '⎇', label: 'Git branch', color: '#fb923c' },
  cloud: { glyph: '☁', label: 'Cloud', color: '#22d3ee' },
  cpu: { glyph: '▦', label: 'CPU', color: '#c084fc' },
  root: { glyph: '#', label: 'Root', color: '#39ff88' },
}

/** Reel strip for the animation: random filler, ending with the engine's 3 symbols (top → bottom). */
export function buildStrip(finalRows: SlotSymbol[], filler: number, rand: () => number = Math.random): SlotSymbol[] {
  const fill = Array.from({ length: filler }, () => SLOT_SYMBOLS[Math.floor(rand() * SLOT_SYMBOLS.length)])
  return [...fill, ...finalRows]
}

/** Cells (reel,row) that are part of a winning line (only the matched leading cells). */
export function winningCells(wins: LineWin[]): Set<string> {
  const s = new Set<string>()
  for (const w of wins) for (let r = 0; r < w.count; r++) s.add(`${r}:${PAYLINES[w.line][r]}`)
  return s
}

/** SVG polyline points for a payline on a 5×ROWS grid of 100×100 cells. */
export const linePoints = (line: number) => PAYLINES[line].map((row, reel) => `${reel * 100 + 50},${row * 100 + 50}`).join(' ')
export const GRID_H = ROWS * 100
