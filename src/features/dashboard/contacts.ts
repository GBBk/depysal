// Exportar contactos (.vcf) para armar una lista de difusión en WhatsApp.
// La app no manda mensajes: el dueño carga el archivo en la agenda y envía desde WhatsApp.

import { toWhatsAppNumber } from './whatsapp'

export type ContactClient = {
  nombre: string
  apellido: string
  telefono: string | null
  activo: boolean
}

/** Escapa un texto de vCard (RFC 6350): barra invertida, coma, punto y coma y saltos de línea. */
function escapeText(value: string): string {
  return value
    .trim()
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\r?\n/g, '\\n')
}

/**
 * Arma el archivo con los clientes activos que tienen un teléfono válido.
 * `omitidos` son los activos sin teléfono válido (para avisarle al dueño).
 */
export function buildContactsVcf(clients: ContactClient[]): {
  vcf: string
  incluidos: number
  omitidos: number
} {
  const cards: string[] = []
  let omitidos = 0
  for (const c of clients) {
    if (!c.activo) continue
    const numero = toWhatsAppNumber(c.telefono)
    if (!numero) {
      omitidos++
      continue
    }
    const nombre = escapeText(c.nombre)
    const apellido = escapeText(c.apellido)
    cards.push(
      [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${apellido};${nombre};;;`,
        `FN:${`${nombre} ${apellido}`.trim()}`,
        `TEL;TYPE=CELL:+${numero}`,
        'END:VCARD',
      ].join('\r\n'),
    )
  }
  return { vcf: cards.length ? `${cards.join('\r\n')}\r\n` : '', incluidos: cards.length, omitidos }
}
