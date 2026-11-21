import { formatDate } from '@/lib/format'

/**
 * Pasa un teléfono argentino al formato internacional que pide wa.me (sin + ni espacios).
 * Celulares: 54 + 9 + código de área + número, sin el 0 ni el 15.
 * Devuelve null si no hay suficientes dígitos para un número válido.
 */
export function toWhatsAppNumber(telefono: string | null | undefined): string | null {
  if (!telefono) return null
  let digits = telefono.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)

  if (digits.startsWith('54')) {
    digits = digits.slice(2)
    if (digits.startsWith('9')) digits = digits.slice(1)
  }
  if (digits.startsWith('0')) digits = digits.slice(1)
  // 0341 15 555-0101 → 341 555-0101: el 15 va después del código de área (2 a 4 dígitos).
  if (digits.length === 12) {
    for (const areaLength of [2, 3, 4]) {
      if (digits.slice(areaLength, areaLength + 2) === '15') {
        digits = digits.slice(0, areaLength) + digits.slice(areaLength + 2)
        break
      }
    }
  }
  return digits.length === 10 ? `549${digits}` : null
}

export type ReminderStatus = {
  estado: string | null
  hasta: string | null
  clases_restantes: number | null
}

/** Recordatorio ya escrito para un cliente vencido o por vencer. */
export function reminderMessage(nombre: string, status: ReminderStatus): string {
  if (status.estado === 'vencido') {
    return `¡Hola, ${nombre}! Te escribimos de Deporte y Salud: tu cuota está vencida. Cuando puedas, acercate a renovarla. ¡Gracias!`
  }
  const detalle =
    status.clases_restantes !== null && status.clases_restantes <= 2
      ? status.clases_restantes === 1
        ? 'te queda 1 clase'
        : `te quedan ${status.clases_restantes} clases`
      : status.hasta
        ? `tu plan vence el ${formatDate(status.hasta)}`
        : 'tu plan está por vencer'
  return `¡Hola, ${nombre}! Te escribimos de Deporte y Salud: ${detalle}. Acordate de renovar para seguir entrenando. ¡Gracias!`
}

export function whatsAppUrl(numero: string, mensaje: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}
