import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/ICT-Casino/',
  plugins: [react(), tailwindcss()],
  test: { include: ['src/**/*.test.ts'] },
} as any)
