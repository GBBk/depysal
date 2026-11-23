// Kiosco de asistencias: qué devuelve kiosk_check_in y qué le mostramos al cliente que llega.
// Toda la decisión la toma la base (función kiosk_check_in); acá solo se traduce a texto.

import { z } from 'zod'
import { formatDate } from '@/lib/format'

export const kioskResultSchema = z.object({
  resultado: z.enum([
    'registrada',
    'ya_registrada',
    'debe_abonar',
    'sin_clases_hoy',
    'pase_libre',
    'no_encontrado',
    'inactivo',
    'dni_invalido',
  ]),
  nombre: z.string().nullable(),
  clases_restantes: z.number().int().nullable(),
  hasta: z.string().nullable(),
  tiene_periodo_en_espera: z.boolean().nullable(),
})

export type KioskResult = z.infer<typeof kioskResultSchema>

export type KioskMessage = {
  tone: 'ok' | 'warn' | 'error'
  title: string
  detail: string
}

function clases(n: number): string {
  return n === 1 ? 'Te queda 1 clase' : `Te quedan ${n} clases`
}

function vence(hasta: string | null): string {
  return hasta ? ` · vence el ${formatDate(hasta)}` : ''
}

/** Texto para el cliente (en segunda persona: lo lee quien puso su DNI). */
export function describeKioskResult(r: KioskResult): KioskMessage {
  switch (r.resultado) {
    case 'registrada': {
      const restantes = r.clases_restantes ?? 0
      return {
        tone: 'ok',
        title: '¡Asistencia registrada!',
        detail:
          restantes > 0
            ? `${clases(restantes)}${vence(r.hasta)}`
            : r.tiene_periodo_en_espera
              ? 'Era tu última clase. El próximo mes ya está pago.'
              : 'Era tu última clase: para la próxima tenés que abonar la cuota.',
      }
    }
    case 'ya_registrada':
      return {
        tone: 'warn',
        title: 'Ya tenías la asistencia de hoy',
        detail: 'No se descontó otra clase.',
      }
    case 'debe_abonar':
      return {
        tone: 'error',
        title: 'Tenés que abonar la cuota',
        detail: 'No se registró la asistencia. Acercate a recepción.',
      }
    case 'sin_clases_hoy':
      return {
        tone: 'warn',
        title: 'Hoy no tenés clases disponibles',
        detail: 'Tu próximo período ya está pago. Acercate a recepción.',
      }
    case 'pase_libre':
      return {
        tone: 'ok',
        title: 'Pase libre: podés pasar',
        detail: `No hace falta anotarte${vence(r.hasta)}.`,
      }
    case 'no_encontrado':
      return {
        tone: 'error',
        title: 'DNI no encontrado',
        detail: 'Revisá el número o acercate a recepción.',
      }
    case 'inactivo':
      return {
        tone: 'error',
        title: 'Tu cuenta está dada de baja',
        detail: 'Acercate a recepción.',
      }
    case 'dni_invalido':
      return {
        tone: 'error',
        title: 'DNI inválido',
        detail: 'Escribí tu DNI: 7 u 8 números, sin puntos.',
      }
  }
}
