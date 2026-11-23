import { describe, expect, it } from 'vitest'
import { describeKioskResult, kioskResultSchema, type KioskResult } from './result'

const base: KioskResult = {
  resultado: 'registrada',
  nombre: 'Ana',
  clases_restantes: 5,
  hasta: '2026-12-20',
  tiene_periodo_en_espera: false,
}

describe('kioskResultSchema', () => {
  it('acepta lo que devuelve la función, con nulos', () => {
    const vacio = {
      resultado: 'no_encontrado',
      nombre: null,
      clases_restantes: null,
      hasta: null,
      tiene_periodo_en_espera: null,
    }
    expect(kioskResultSchema.parse(vacio)).toEqual(vacio)
  })

  it('rechaza un resultado desconocido', () => {
    expect(kioskResultSchema.safeParse({ ...base, resultado: 'otro' }).success).toBe(false)
  })
})

describe('describeKioskResult', () => {
  it('registrada: clases que le quedan y vencimiento', () => {
    expect(describeKioskResult(base)).toEqual({
      tone: 'ok',
      title: '¡Asistencia registrada!',
      detail: 'Te quedan 5 clases · vence el 20/12/2026',
    })
    expect(describeKioskResult({ ...base, clases_restantes: 1 }).detail).toBe(
      'Te queda 1 clase · vence el 20/12/2026',
    )
  })

  it('registrada con su última clase: avisa si tiene que abonar', () => {
    const ultima = { ...base, clases_restantes: 0 }
    expect(describeKioskResult(ultima).detail).toMatch(/tenés que abonar/)
    expect(describeKioskResult({ ...ultima, tiene_periodo_en_espera: true }).detail).toMatch(
      /ya está pago/,
    )
  })

  it('cada resultado que no registra tiene su mensaje', () => {
    const casos = [
      ['ya_registrada', 'warn', 'Ya tenías la asistencia de hoy'],
      ['debe_abonar', 'error', 'Tenés que abonar la cuota'],
      ['sin_clases_hoy', 'warn', 'Hoy no tenés clases disponibles'],
      ['pase_libre', 'ok', 'Pase libre: podés pasar'],
      ['no_encontrado', 'error', 'DNI no encontrado'],
      ['inactivo', 'error', 'Tu cuenta está dada de baja'],
      ['dni_invalido', 'error', 'DNI inválido'],
    ] as const
    for (const [resultado, tone, title] of casos) {
      expect(describeKioskResult({ ...base, resultado })).toMatchObject({ tone, title })
    }
  })
})
