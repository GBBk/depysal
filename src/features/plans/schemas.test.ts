import { describe, expect, it } from 'vitest'
import { planSchema, toPlanUpdate, toPlanValues } from './schemas'

describe('planSchema', () => {
  it('acepta clases vacías (ilimitadas) y precio con coma', () => {
    const values = planSchema.parse({ nombre: 'Pase libre', precio: '40000,50', clases: '' })
    expect(toPlanUpdate(values)).toEqual({ nombre: 'Pase libre', precio: 40000.5, clases: null })
  })

  it('rechaza clases en 0 y precios inválidos', () => {
    expect(planSchema.safeParse({ nombre: 'X', precio: '100', clases: '0' }).success).toBe(false)
    expect(planSchema.safeParse({ nombre: 'X', precio: '-5', clases: '8' }).success).toBe(false)
    expect(planSchema.safeParse({ nombre: '', precio: '100', clases: '8' }).success).toBe(false)
  })

  it('ida y vuelta entre el plan de la base y el formulario', () => {
    const plan = { nombre: '2 días por semana', precio: 25000, clases: 8 }
    expect(toPlanUpdate(planSchema.parse(toPlanValues(plan)))).toEqual(plan)
  })
})
