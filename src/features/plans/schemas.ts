import { z } from 'zod'

// El formulario trabaja con strings; toPlanUpdate los convierte a lo que espera la base.
export const planSchema = z.object({
  nombre: z.string().trim().min(1, 'Ingresá el nombre'),
  precio: z
    .string()
    .trim()
    .regex(/^\d+([.,]\d{1,2})?$/, 'Ingresá un precio válido (por ejemplo, 25000)'),
  clases: z
    .string()
    .trim()
    .regex(/^\d*$/, 'Solo números')
    .refine((v) => v === '' || Number(v) > 0, 'Tiene que ser mayor a 0'),
})

export type PlanValues = z.infer<typeof planSchema>

export function toPlanUpdate(values: PlanValues) {
  return {
    nombre: values.nombre.trim(),
    precio: Number(values.precio.trim().replace(',', '.')),
    clases: values.clases.trim() === '' ? null : Number(values.clases),
  }
}

export function toPlanValues(plan: {
  nombre: string
  precio: number
  clases: number | null
}): PlanValues {
  return {
    nombre: plan.nombre,
    precio: String(plan.precio),
    clases: plan.clases === null ? '' : String(plan.clases),
  }
}
