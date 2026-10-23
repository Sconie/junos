import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The UI only ever talks to junosd through /api; no CORS, same origin.
    proxy: { '/api': { target: 'http://127.0.0.1:4777', changeOrigin: false } },
  },
  test: {
    environment: 'jsdom',
  },
})
