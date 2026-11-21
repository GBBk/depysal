import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { QuickAttendance } from '@/features/attendances/QuickAttendance'
import {
  useClients,
  useClientStatuses,
  type ClientRow,
  type ClientStatus,
} from '@/features/clients/api'
import { filterClients } from '@/features/clients/search'
import { StatusBadge } from '@/features/clients/StatusBadge'
import { formatDate, formatMoney, monthRange, todayISO } from '@/lib/format'
import { useMonthlyIncome } from './api'
import { reminderMessage, toWhatsAppNumber, whatsAppUrl } from './whatsapp'

const MAX_RESULTS = 10

type ClientWithStatus = { client: ClientRow; status: ClientStatus }

export function DashboardPage() {
  const clients = useClients()
  const statuses = useClientStatuses()
  const income = useMonthlyIncome()
  const [query, setQuery] = useState('')

  const statusById = new Map(statuses.data?.map((s) => [s.client_id, s]))
  const results =
    query.trim() && clients.data
      ? filterClients(clients.data, query, false).slice(0, MAX_RESULTS)
      : []

  // Las listas y el contador son de clientes activos: las bajas no se cuentan ni se avisan.
  const active: ClientWithStatus[] = []
  for (const client of clients.data ?? []) {
    const status = statusById.get(client.id)
    if (client.activo && status) active.push({ client, status })
  }
  const vencidos = active.filter((c) => c.status.estado === 'vencido')
  const porVencer = active
    .filter((c) => c.status.estado === 'por_vencer')
    .sort((a, b) => (a.status.hasta ?? '').localeCompare(b.status.hasta ?? ''))
  const alDia = active.filter((c) => c.status.estado === 'al_dia').length

  const month = new Date(`${monthRange(todayISO()).desde}T12:00:00Z`).toLocaleDateString('es-AR', {
    month: 'long',
    timeZone: 'UTC',
  })
  const loadingClients = clients.isPending || statuses.isPending

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-xl font-semibold">Panel</h1>

      <section className="flex flex-col gap-2">
        <Input
          type="search"
          placeholder="Buscar cliente por nombre o DNI para registrar asistencia"
          aria-label="Buscar cliente"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {query.trim() && clients.data && results.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin resultados.</p>
        )}
        {results.length > 0 && (
          <ul className="divide-y rounded-lg border px-3">
            {results.map((c) => {
              const status = statusById.get(c.id)
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="flex items-center gap-2">
                    <ClientLink client={c} />
                    <StatusBadge estado={status?.estado} />
                  </div>
                  {status && <QuickAttendance clientId={c.id} status={status} />}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {(clients.isError || statuses.isError) && (
        <p className="text-sm text-destructive">No se pudieron cargar los clientes.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Clientes al día" value={loadingClients ? '…' : String(alDia)} />
        <Stat
          label={`Ingresos de ${month}`}
          value={income.isPending ? '…' : income.isError ? 'Error' : formatMoney(income.data.total)}
          detail={
            income.data && (income.data.pagos === 1 ? '1 pago' : `${income.data.pagos} pagos`)
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ClientList
          title={`Vencidos (${vencidos.length})`}
          empty="No hay clientes vencidos."
          loading={loadingClients}
          items={vencidos}
        />
        <ClientList
          title={`Por vencer (${porVencer.length})`}
          empty="No hay clientes por vencer."
          loading={loadingClients}
          items={porVencer}
        />
      </div>
    </div>
  )
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold">{value}</span>
        {detail && <span className="text-sm text-muted-foreground">{detail}</span>}
      </CardContent>
    </Card>
  )
}

function ClientList({
  title,
  empty,
  loading,
  items,
}: {
  title: string
  empty: string
  loading: boolean
  items: ClientWithStatus[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="divide-y">
            {items.map(({ client, status }) => (
              <li key={client.id} className="flex items-center justify-between gap-2 py-2">
                <div className="flex flex-col">
                  <ClientLink client={client} />
                  <span className="text-sm text-muted-foreground">{statusDetail(status)}</span>
                </div>
                <WhatsAppButton client={client} status={status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function statusDetail(status: ClientStatus): string {
  if (status.estado === 'vencido') return 'Sin período vigente'
  const parts: string[] = []
  if (status.hasta) parts.push(`Vence el ${formatDate(status.hasta)}`)
  if (status.clases_restantes !== null) {
    parts.push(
      status.clases_restantes === 1 ? 'queda 1 clase' : `quedan ${status.clases_restantes} clases`,
    )
  }
  return parts.join(' · ')
}

function WhatsAppButton({ client, status }: { client: ClientRow; status: ClientStatus }) {
  const numero = toWhatsAppNumber(client.telefono)
  if (!numero) return <span className="text-xs text-muted-foreground">Sin teléfono</span>
  return (
    <a
      href={whatsAppUrl(numero, reminderMessage(client.nombre, status))}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants({ variant: 'outline', size: 'sm' })}
    >
      WhatsApp
    </a>
  )
}

function ClientLink({ client }: { client: ClientRow }) {
  return (
    <Link to={`/admin/clientes/${client.id}`} className="font-medium hover:underline">
      {client.apellido}, {client.nombre}
    </Link>
  )
}
