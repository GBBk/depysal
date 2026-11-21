import { z } from 'zod'

export const medios = ['efectivo', 'transferencia', 'otro'] as const
export type Medio = (typeof medios)[number]

export const medioLabels: Record<Medio, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  otro: 'Otro',
}

export function medioLabel(medio: string): string {
  return (medios as readonly string[]).includes(medio) ? medioLabels[medio as Medio] : medio
}

// El formulario trabaja con strings; toPaymentInsert los convierte a lo que espera la base.
export const paymentSchema = z.object({
  plan_id: z.string().regex(/^\d+$/, 'Elegí un plan'),
  monto: z
    .string()
    .trim()
    .regex(/^\d+([.,]\d{1,2})?$/, 'Ingresá un monto válido (por ejemplo, 25000)'),
  medio: z.enum(medios, 'Elegí el medio de pago'),
  fecha_pago: z.iso.date('Ingresá una fecha válida'),
})

export type PaymentValues = z.infer<typeof paymentSchema>

export function toPaymentInsert(clientId: string, values: PaymentValues) {
  return {
    client_id: clientId,
    plan_id: Number(values.plan_id),
    monto: Number(values.monto.trim().replace(',', '.')),
    medio: values.medio,
    fecha_pago: values.fecha_pago,
  }
}
