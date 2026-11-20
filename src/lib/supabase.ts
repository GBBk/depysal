import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el archivo .env')
}

// En T02, después de la primera migración, tipar con:
//   import type { Database } from '@/types/database'
//   createClient<Database>(url, anonKey)
export const supabase = createClient(url, anonKey)
