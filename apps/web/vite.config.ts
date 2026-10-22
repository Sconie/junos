import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The UI only ever talks to junosd through /api; no CORS, same origin. changeOrigin makes the Host
    // header the daemon's own, which is the only Host junosd accepts.
    proxy: { '/api': { target: 'http://127.0.0.1:4777', changeOrigin: true } },
  },
  test: {
    environment: 'jsdom',
  },
})
