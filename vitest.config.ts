import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// Tests de base de datos (RLS, client_periods, client_status) contra Supabase local.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
    environment: 'node',
    // Los tests de base de datos comparten estado: se corren en serie.
    fileParallelism: false,
  },
})
