import { describe, expect, it } from 'vitest'
import { formatDate, formatMoney, monthRange, todayISO } from './format'

describe('format', () => {
  it('todayISO usa la fecha de Argentina, no la UTC', () => {
    // 22:30 del 1/3 en Argentina = 01:30 UTC del 2/3.
    expect(todayISO(new Date('2026-03-02T01:30:00Z'))).toBe('2026-03-01')
    expect(todayISO(new Date('2026-03-02T03:30:00Z'))).toBe('2026-03-02')
  })

  it('formatDate muestra la fecha en es-AR sin correrla de día', () => {
    expect(formatDate('2026-03-01')).toBe('1/3/2026')
    expect(formatDate('2026-12-31')).toBe('31/12/2026')
  })

  it('monthRange devuelve el primer y el último día del mes', () => {
    expect(monthRange('2026-11-20')).toEqual({ desde: '2026-11-01', hasta: '2026-11-30' })
    expect(monthRange('2028-02-10')).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' })
    expect(monthRange('2026-12-31')).toEqual({ desde: '2026-12-01', hasta: '2026-12-31' })
  })

  it('formatMoney formatea en pesos', () => {
    expect(formatMoney(25000).replace(/\s/g, ' ')).toBe('$ 25.000,00')
  })
})
