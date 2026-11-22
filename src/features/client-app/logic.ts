import { z } from 'zod'

type Completion = { id: number; dia: string; fecha: string }

/** Marca de un día en una fecha (para saber si ya lo hizo hoy y poder deshacerlo). */
export function completionOn(completions: Completion[], dia: string, fecha: string) {
  return completions.find((c) => c.dia === dia && c.fecha === fecha)
}

/** Última fecha en que hizo ese día, o undefined. */
export function lastDone(completions: Completion[], dia: string): string | undefined {
  let last: string | undefined
  for (const c of completions) if (c.dia === dia && (!last || c.fecha > last)) last = c.fecha
  return last
}

/**
 * Pestaña que se abre al entrar: el día que sigue al último que hizo (en ronda: después del
 * último vuelve al primero). Si nunca marcó nada, el primero.
 */
export function suggestedDay(days: string[], completions: Completion[]): string | undefined {
  if (days.length === 0) return undefined
  let latest: Completion | undefined
  for (const c of completions) {
    if (!days.includes(c.dia)) continue
    if (!latest || c.fecha > latest.fecha || (c.fecha === latest.fecha && c.id > latest.id)) {
      latest = c
    }
  }
  if (!latest) return days[0]
  return days[(days.indexOf(latest.dia) + 1) % days.length]
}

export const passwordSchema = z
  .object({
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  })

export type PasswordValues = z.infer<typeof passwordSchema>
