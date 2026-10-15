import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

export default defineConfig({
  base: '/ICT-Casino/',
  plugins: [react(), tailwindcss()],
  // app version for the top bar; Vitest uses this config too, so tests see it
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: { include: ['src/**/*.test.ts'] },
} as any)
