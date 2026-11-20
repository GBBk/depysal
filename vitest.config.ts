import { fileURLToPath, URL } from 'node:url'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// Tests de base de datos (RLS, client_periods, client_status) contra Supabase local.
export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
    environment: 'node',
    // Carga todas las variables de .env (incluida SUPABASE_SERVICE_ROLE_KEY, que no lleva VITE_).
    env: loadEnv(mode, process.cwd(), ''),
    // Los tests de base de datos comparten estado: se corren en serie.
    fileParallelism: false,
  },
}))
