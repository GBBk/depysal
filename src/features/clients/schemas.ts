import { z } from 'zod'

// Mismas reglas que supabase/functions/create-client/index.ts.
export const clientSchema = z.object({
  nombre: z.string().trim().min(1, 'Ingresá el nombre'),
  apellido: z.string().trim().min(1, 'Ingresá el apellido'),
  dni: z.string().regex(/^\d{7,8}$/, 'El DNI son 7 u 8 números, sin puntos'),
  telefono: z
    .string()
    .trim()
    .regex(/^[\d\s+()-]*$/, 'Solo números, espacios y + ( ) -'),
  email: z.email('Ingresá un email válido'),
  notas: z.string().trim(),
})

export const createClientSchema = clientSchema.extend({
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

/** En la edición el email no se cambia (es el usuario de login, vive en Auth). */
export const updateClientSchema = clientSchema.omit({ email: true })

export type ClientValues = z.infer<typeof clientSchema>
export type CreateClientValues = z.infer<typeof createClientSchema>
export type UpdateClientValues = z.infer<typeof updateClientSchema>
