// Crea un usuario cliente (Auth + profile). Solo la puede llamar un admin.
// Es el único lugar donde se usa la service role key (nunca en src/).
import { createClient } from 'npm:@supabase/supabase-js@2.119.2'
import { z } from 'npm:zod@4.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Mismas reglas que src/features/clients/schemas.ts.
const bodySchema = z.object({
  nombre: z.string().trim().min(1),
  apellido: z.string().trim().min(1),
  dni: z.string().regex(/^\d{7,8}$/),
  telefono: z.string().trim().optional(),
  email: z.email(),
  notas: z.string().trim().optional(),
  password: z.string().min(6),
})

type ErrorField = 'email' | 'dni'

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function fail(status: number, error: string, field?: ErrorField): Response {
  return json(status, field ? { error, field } : { error })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail(405, 'Método no permitido')

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anonKey || !serviceKey) return fail(500, 'Configuración incompleta')

  // 1. Quien llama tiene que ser admin (se verifica con su propio token y el RLS).
  const authorization = req.headers.get('Authorization')
  if (!authorization) return fail(401, 'Falta iniciar sesión')

  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const { data: isAdmin, error: adminError } = await caller.rpc('is_admin')
  if (adminError) return fail(401, 'Sesión inválida')
  if (isAdmin !== true) return fail(403, 'Solo un admin puede crear clientes')

  // 2. Validar datos.
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return fail(400, 'Datos inválidos')
  }
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return fail(400, 'Datos inválidos')
  const { nombre, apellido, dni, telefono, email, notas, password } = parsed.data

  const service = createClient(url, serviceKey, { auth: { persistSession: false } })

  // 3. DNI único (se chequea antes para dar un error claro; la base igual tiene UNIQUE).
  const { count, error: dniError } = await service
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('dni', dni)
  if (dniError) return fail(500, 'No se pudo verificar el DNI')
  if (count && count > 0) return fail(409, 'Ya existe un cliente con ese DNI', 'dni')

  // 4. Crear el usuario. El trigger handle_new_user crea el profile con rol 'client'.
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, apellido, dni, telefono: telefono ?? '' },
  })
  if (createError) {
    if (createError.code === 'email_exists') {
      return fail(409, 'Ya existe un usuario con ese email', 'email')
    }
    return fail(500, 'No se pudo crear el usuario')
  }

  if (notas) {
    const { error: notasError } = await service
      .from('profiles')
      .update({ notas })
      .eq('id', created.user.id)
    if (notasError) return fail(500, 'Se creó el cliente pero no se guardaron las notas')
  }

  return json(201, { id: created.user.id })
})
