// Exportar los pagos de un mes a un .csv que Excel (en español, Argentina) abre directo:
// separador ';', coma decimal, fechas dd/mm/aaaa y BOM para que respete los acentos.

import { formatDate } from '@/lib/format'
import { medioLabel } from './schemas'

export type ExportPayment = {
  id: number
  fecha_pago: string
  monto: number
  medio: string
  anulado: boolean
  clases: number | null
  plans: { nombre: string } | null
  profiles: { nombre: string; apellido: string; dni: string | null } | null
}

/** Marca UTF-8 al inicio: sin ella Excel lee los acentos mal. */
const BOM = String.fromCharCode(0xfeff)

const HEADER = ['Fecha', 'Cliente', 'DNI', 'Plan', 'Clases', 'Medio', 'Monto', 'Anulado']

/**
 * Un campo del CSV. Lo que empieza con = + - @ (o tab/retorno) se antepone con ' para que Excel
 * no lo tome como fórmula (inyección de fórmulas en CSV: un nombre como "=HYPERLINK(...)").
 */
export function csvField(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[;"\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

/** 32000.5 → '32000,50' (número que Excel en es-AR reconoce, sin separador de miles). */
function amount(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

/** 'YYYY-MM' → primer y último día del mes. */
export function monthBounds(month: string): { desde: string; hasta: string } {
  const [year, mon] = month.split('-').map(Number)
  const last = new Date(Date.UTC(year, mon, 0)).getUTCDate()
  return { desde: `${month}-01`, hasta: `${month}-${String(last).padStart(2, '0')}` }
}

export function paymentsFileName(month: string): string {
  return `pagos-${month}.csv`
}

/** Arma el CSV. Los anulados se incluyen marcados y no suman al total. */
export function buildPaymentsCsv(payments: ExportPayment[]): {
  csv: string
  total: number
  validos: number
  anulados: number
} {
  const rows = payments.map((p) => [
    formatDate(p.fecha_pago),
    p.profiles ? `${p.profiles.apellido}, ${p.profiles.nombre}` : '',
    p.profiles?.dni ?? '',
    p.plans?.nombre ?? '',
    p.clases === null ? 'Libre' : String(p.clases),
    medioLabel(p.medio),
    amount(p.monto),
    p.anulado ? 'Sí' : 'No',
  ])
  const validos = payments.filter((p) => !p.anulado)
  const total = validos.reduce((sum, p) => sum + p.monto, 0)
  const lines = [
    HEADER,
    ...rows,
    [],
    ['Total (sin anulados)', '', '', '', '', '', amount(total), ''],
  ].map((cells) => cells.map(csvField).join(';'))
  return {
    csv: `${BOM}${lines.join('\r\n')}\r\n`,
    total,
    validos: validos.length,
    anulados: payments.length - validos.length,
  }
}
