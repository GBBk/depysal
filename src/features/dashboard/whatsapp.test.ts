import { describe, expect, it } from 'vitest'
import { reminderMessage, toWhatsAppNumber, whatsAppUrl } from './whatsapp'

describe('toWhatsAppNumber', () => {
  it('agrega 549 a un celular de 10 dígitos', () => {
    expect(toWhatsAppNumber('3415550101')).toBe('5493415550101')
    expect(toWhatsAppNumber('341 555-0101')).toBe('5493415550101')
  })

  it('saca el 0 del código de área y el 15', () => {
    expect(toWhatsAppNumber('0341 15 555-0101')).toBe('5493415550101')
    expect(toWhatsAppNumber('011 15 4444-5555')).toBe('5491144445555')
    expect(toWhatsAppNumber('(0341) 155550101')).toBe('5493415550101')
  })

  it('respeta números que ya vienen con código de país', () => {
    expect(toWhatsAppNumber('+54 9 341 555-0101')).toBe('5493415550101')
    expect(toWhatsAppNumber('+54 341 555-0101')).toBe('5493415550101')
    expect(toWhatsAppNumber('0054 9 11 4444 5555')).toBe('5491144445555')
  })

  it('devuelve null si no hay un número usable', () => {
    expect(toWhatsAppNumber(null)).toBeNull()
    expect(toWhatsAppNumber('')).toBeNull()
    expect(toWhatsAppNumber('12345')).toBeNull()
  })
})

describe('reminderMessage', () => {
  it('vencido', () => {
    expect(reminderMessage('Ana', { estado: 'vencido', hasta: null, clases_restantes: null })).toBe(
      '¡Hola, Ana! Te escribimos de Deporte y Salud: tu cuota está vencida. Cuando puedas, acercate a renovarla. ¡Gracias!',
    )
  })

  it('por vencer por clases o por fecha', () => {
    expect(
      reminderMessage('Ana', { estado: 'por_vencer', hasta: '2026-12-07', clases_restantes: 2 }),
    ).toContain('te quedan 2 clases')
    expect(
      reminderMessage('Ana', { estado: 'por_vencer', hasta: '2026-12-07', clases_restantes: 1 }),
    ).toContain('te queda 1 clase')
    expect(
      reminderMessage('Ana', { estado: 'por_vencer', hasta: '2026-11-23', clases_restantes: null }),
    ).toContain('tu plan vence el 23/11/2026')
  })
})

describe('whatsAppUrl', () => {
  it('codifica el mensaje', () => {
    expect(whatsAppUrl('5493415550101', '¡Hola, Ana!')).toBe(
      'https://wa.me/5493415550101?text=%C2%A1Hola%2C%20Ana!',
    )
  })
})
