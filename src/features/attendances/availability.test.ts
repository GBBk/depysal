import { describe, expect, it } from 'vitest'
import { attendanceAvailability, attendanceErrorMessage } from './availability'

const base = { periodo_actual: 1, clases_restantes: 5, tiene_periodo_en_espera: false }

describe('attendanceAvailability', () => {
  it('con clases restantes se puede registrar', () => {
    expect(attendanceAvailability(base)).toEqual({ kind: 'ok', restantes: 5 })
  })

  it('sin período vigente o sin clases: Debe abonar', () => {
    expect(
      attendanceAvailability({ ...base, periodo_actual: null, clases_restantes: null }),
    ).toEqual({ kind: 'debe_abonar' })
    expect(attendanceAvailability({ ...base, clases_restantes: 0 })).toEqual({
      kind: 'debe_abonar',
    })
  })

  it('sin clases hoy pero con el siguiente ya pago no pide abonar', () => {
    expect(
      attendanceAvailability({ ...base, clases_restantes: 0, tiene_periodo_en_espera: true }),
    ).toEqual({ kind: 'sin_clases_hoy' })
  })

  it('pase libre no registra asistencias', () => {
    expect(attendanceAvailability({ ...base, clases_restantes: null })).toEqual({
      kind: 'pase_libre',
    })
  })
})

describe('attendanceErrorMessage', () => {
  it('traduce los errores de la base', () => {
    expect(attendanceErrorMessage({ message: 'debe_abonar' })).toMatch(/^Debe abonar/)
    expect(attendanceErrorMessage({ message: 'pase_libre' })).toMatch(/pase libre/)
    expect(attendanceErrorMessage({ code: '23505', message: 'duplicate key' })).toMatch(/Ya tiene/)
    expect(attendanceErrorMessage(new Error('red'))).toMatch(/No se pudo/)
  })
})
