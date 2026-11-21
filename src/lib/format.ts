// Fechas de negocio ('YYYY-MM-DD', sin hora) y moneda. "Hoy" es la fecha de Argentina,
// igual que en la base (vista client_status).

const TIME_ZONE = 'America/Argentina/Buenos_Aires'

/** Hoy en Argentina como 'YYYY-MM-DD'. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now)
}

/** '2026-03-01' → '1/3/2026'. Se arma la fecha al mediodía UTC para que ningún huso la corra. */
export function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-AR', { timeZone: 'UTC' })
}

/** Primer y último día del mes de una fecha 'YYYY-MM-DD'. */
export function monthRange(iso: string): { desde: string; hasta: string } {
  const [year, month] = iso.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const mm = String(month).padStart(2, '0')
  return { desde: `${year}-${mm}-01`, hasta: `${year}-${mm}-${String(lastDay).padStart(2, '0')}` }
}

const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })

export function formatMoney(amount: number): string {
  return currency.format(amount)
}
