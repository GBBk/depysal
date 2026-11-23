import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type Db = SupabaseClient<Database>

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta ${name} en .env (ver .env.example)`)
  return value
}

const url = requireEnv('VITE_SUPABASE_URL')
const anonKey = requireEnv('VITE_SUPABASE_ANON_KEY')
const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

const noSession = { auth: { persistSession: false, autoRefreshToken: false } }

/** Cliente con service role: solo para preparar y limpiar datos en los tests. */
export const service: Db = createClient<Database>(url, serviceKey, noSession)

/** Cliente anónimo (sin sesión). */
export function anonClient(): Db {
  return createClient<Database>(url, anonKey, noSession)
}

/** DNI aleatorio de 8 dígitos, para no chocar con el seed ni con otros tests. */
export function randomDni(): string {
  return String(10_000_000 + Math.floor(Math.random() * 89_999_999))
}

export type TestUser = { id: string; email: string; db: Db }

/** Crea un usuario con el rol indicado y devuelve un cliente con su sesión iniciada. */
export async function createUser(
  rol: 'admin' | 'client' | 'kiosk',
  userMetadata: Record<string, unknown> = {},
): Promise<TestUser> {
  const email = `test-${randomUUID()}@deporteysalud.test`
  const password = randomUUID()

  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  })
  if (error) throw error

  if (rol !== 'client') {
    const { error: promoteError } = await service
      .from('profiles')
      .update({ rol })
      .eq('id', data.user.id)
    if (promoteError) throw promoteError
  }

  const db = anonClient()
  const { error: signInError } = await db.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError

  return { id: data.user.id, email, db }
}

export async function deleteUsers(...users: TestUser[]): Promise<void> {
  for (const user of users) {
    const { error } = await service.auth.admin.deleteUser(user.id)
    if (error) throw error
  }
}
