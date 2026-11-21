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

const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })

export function formatMoney(amount: number): string {
  return currency.format(amount)
}
