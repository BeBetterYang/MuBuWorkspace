import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'tests/e2e/**'],
  },
  server: {
    host: '0.0.0.0',
    port: 5185,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': 'http://127.0.0.1:5190',
    },
  },
})
