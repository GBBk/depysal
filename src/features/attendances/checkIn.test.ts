import { describe, expect, it } from 'vitest'
import {
  checkInDecision,
  describeCheckIn,
  normalizeDni,
  type CheckInResult,
  type CheckInStatus,
} from './checkIn'

const status: CheckInStatus = {
  periodo_actual: 1,
  clases_restantes: 5,
  tiene_periodo_en_espera: false,
  hasta: '2026-12-20',
}
const client = { id: 'c1', nombre: 'Ana', apellido: 'Pérez' }

describe('normalizeDni', () => {
  it('acepta 7 u 8 números, con o sin puntos y espacios', () => {
    expect(normalizeDni('30111222')).toBe('30111222')
    expect(normalizeDni(' 30.111.222 ')).toBe('30111222')
    expect(normalizeDni('5.123.456')).toBe('5123456')
  })

  it('rechaza lo que no es un DNI', () => {
    expect(normalizeDni('')).toBeNull()
    expect(normalizeDni('123456')).toBeNull()
    expect(normalizeDni('123456789')).toBeNull()
    expect(normalizeDni('ana')).toBeNull()
  })
})

describe('checkInDecision', () => {
  it('con clases restantes registra', () => {
    expect(checkInDecision(status, false)).toEqual({ action: 'registrar', restantes: 5 })
  })

  it('si ya vino hoy no registra otra, aunque haya usado su última clase', () => {
    expect(checkInDecision(status, true)).toEqual({ action: 'ya_registrada' })
    expect(checkInDecision({ ...status, clases_restantes: 0 }, true)).toEqual({
      action: 'ya_registrada',
    })
  })

  it('sin período o sin clases: Debe abonar', () => {
    expect(
      checkInDecision({ ...status, periodo_actual: null, clases_restantes: null }, false),
    ).toEqual({ action: 'debe_abonar' })
    expect(checkInDecision({ ...status, clases_restantes: 0 }, false)).toEqual({
      action: 'debe_abonar',
    })
  })

  it('sin clases pero con el próximo período pago no pide abonar', () => {
    expect(
      checkInDecision({ ...status, clases_restantes: 0, tiene_periodo_en_espera: true }, false),
    ).toEqual({ action: 'sin_clases_hoy' })
  })

  it('pase libre no registra', () => {
    expect(checkInDecision({ ...status, clases_restantes: null }, false)).toEqual({
      action: 'pase_libre',
    })
  })
})

describe('describeCheckIn', () => {
  const registrada = (restantes: number, enEspera = false): CheckInResult => ({
    kind: 'registrada',
    client,
    status: { ...status, tiene_periodo_en_espera: enEspera },
    restantes,
  })

  it('registrada: clases que le quedan después de la de hoy y vencimiento', () => {
    expect(describeCheckIn(registrada(4))).toEqual({
      tone: 'ok',
      title: 'Asistencia registrada',
      detail: 'Le quedan 4 clases · vence el 20/12/2026',
    })
    expect(describeCheckIn(registrada(1)).detail).toBe('Le queda 1 clase · vence el 20/12/2026')
  })

  it('registrada con la última clase avisa si tiene que abonar', () => {
    expect(describeCheckIn(registrada(0)).detail).toBe(
      'Era su última clase: para la próxima tiene que abonar.',
    )
    expect(describeCheckIn(registrada(0, true)).detail).toBe(
      'Era su última clase. El próximo período ya está pago.',
    )
  })

  it('los casos que no registran se distinguen por tono', () => {
    expect(describeCheckIn({ kind: 'debe_abonar', client, status })).toMatchObject({
      tone: 'error',
      title: 'Debe abonar',
    })
    expect(describeCheckIn({ kind: 'ya_registrada', client, status }).tone).toBe('warn')
    expect(describeCheckIn({ kind: 'sin_clases_hoy', client, status }).tone).toBe('warn')
    expect(
      describeCheckIn({
        kind: 'pase_libre',
        client,
        status: { ...status, clases_restantes: null },
      }),
    ).toEqual({
      tone: 'ok',
      title: 'Pase libre: puede pasar',
      detail: 'No hace falta registrar asistencias · vence el 20/12/2026.',
    })
  })

  it('DNI inválido, no encontrado o dado de baja son errores', () => {
    expect(describeCheckIn({ kind: 'dni_invalido' }).tone).toBe('error')
    expect(describeCheckIn({ kind: 'no_encontrado', dni: '30111222' })).toMatchObject({
      tone: 'error',
      detail: 'No hay ningún cliente con el DNI 30111222.',
    })
    expect(describeCheckIn({ kind: 'inactivo', client }).title).toBe('Cliente dado de baja')
  })
})
