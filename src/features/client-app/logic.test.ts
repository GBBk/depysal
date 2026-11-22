import { describe, expect, it } from 'vitest'
import { completionOn, lastDone, passwordSchema, suggestedDay } from './logic'

const completions = [
  { id: 1, dia: 'A', fecha: '2026-11-10' },
  { id: 2, dia: 'B', fecha: '2026-11-12' },
  { id: 3, dia: 'A', fecha: '2026-11-17' },
]

describe('días hechos', () => {
  it('encuentra la marca de un día en una fecha', () => {
    expect(completionOn(completions, 'A', '2026-11-17')?.id).toBe(3)
    expect(completionOn(completions, 'B', '2026-11-17')).toBeUndefined()
  })

  it('última vez por día', () => {
    expect(lastDone(completions, 'A')).toBe('2026-11-17')
    expect(lastDone(completions, 'C')).toBeUndefined()
  })
})

describe('suggestedDay', () => {
  it('abre el día que sigue al último que hizo, en ronda', () => {
    expect(suggestedDay(['A', 'B', 'C'], completions)).toBe('B') // el último fue A (17/11)
    expect(suggestedDay(['A', 'B'], [{ id: 9, dia: 'B', fecha: '2026-11-20' }])).toBe('A')
  })

  it('sin marcas (o con marcas de días que ya no existen) abre el primero', () => {
    expect(suggestedDay(['A', 'B'], [])).toBe('A')
    expect(suggestedDay(['A', 'B'], [{ id: 1, dia: 'D', fecha: '2026-11-20' }])).toBe('A')
    expect(suggestedDay([], completions)).toBeUndefined()
  })

  it('con dos marcas el mismo día gana la última cargada', () => {
    const sameDay = [
      { id: 5, dia: 'A', fecha: '2026-11-20' },
      { id: 6, dia: 'B', fecha: '2026-11-20' },
    ]
    expect(suggestedDay(['A', 'B', 'C'], sameDay)).toBe('C')
  })
})

describe('passwordSchema', () => {
  it('exige 6 caracteres y que coincidan', () => {
    expect(passwordSchema.safeParse({ password: 'abc123', confirm: 'abc123' }).success).toBe(true)
    expect(passwordSchema.safeParse({ password: 'abc', confirm: 'abc' }).success).toBe(false)
    expect(passwordSchema.safeParse({ password: 'abc123', confirm: 'abc124' }).success).toBe(false)
  })
})
