import { describe, expect, it } from 'vitest'
import { paymentSchema, toPaymentInsert } from './schemas'

const valid = { plan_id: '1', monto: '25000', medio: 'efectivo', fecha_pago: '2026-03-01' }

describe('paymentSchema', () => {
  it('convierte el formulario a la fila de payments', () => {
    const values = paymentSchema.parse({ ...valid, monto: '24999,50' })
    expect(toPaymentInsert('abc', values)).toEqual({
      client_id: 'abc',
      plan_id: 1,
      monto: 24999.5,
      medio: 'efectivo',
      fecha_pago: '2026-03-01',
    })
  })

  it('exige plan, monto válido, medio conocido y fecha', () => {
    expect(paymentSchema.safeParse({ ...valid, plan_id: '' }).success).toBe(false)
    expect(paymentSchema.safeParse({ ...valid, monto: 'mucho' }).success).toBe(false)
    expect(paymentSchema.safeParse({ ...valid, medio: 'bitcoin' }).success).toBe(false)
    expect(paymentSchema.safeParse({ ...valid, fecha_pago: '' }).success).toBe(false)
  })
})
