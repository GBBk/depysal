import { MessageCircle, Search, UserCheck, Wallet, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '@/app/PageHeader'
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
import { ExportPaymentsButton } from '@/features/payments/ExportPaymentsButton'
import { StatusBadge } from '@/features/clients/StatusBadge'
import { formatDate, formatMoney, monthRange, todayISO } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useMonthlyIncome } from './api'
import { ExportContactsButton } from './ExportContactsButton'
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

  const today = new Date(`${todayISO()}T12:00:00Z`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Panel"
        description={today.charAt(0).toUpperCase() + today.slice(1)}
        actions={
          // Alineados arriba: cada botón puede mostrar debajo una línea con el resultado.
          <div className="flex flex-wrap items-start justify-end gap-2">
            <ExportPaymentsButton />
            <ExportContactsButton clients={clients.data} />
          </div>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Buscar cliente (nombre o DNI)"
              aria-label="Buscar cliente"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 pl-10 text-base md:text-base"
              autoFocus
            />
          </div>
          {query.trim() && clients.data && results.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin resultados.</p>
          )}
          {results.length > 0 && (
            <ul className="divide-y">
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
        </CardContent>
      </Card>

      {(clients.isError || statuses.isError) && (
        <p className="text-sm text-destructive">No se pudieron cargar los clientes.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat
          icon={UserCheck}
          label="Clientes al día"
          value={loadingClients ? '…' : String(alDia)}
        />
        <Stat
          dark
          icon={Wallet}
          label={`Ingresos de ${month}`}
          value={income.isPending ? '…' : income.isError ? 'Error' : formatMoney(income.data.total)}
          detail={
            income.data && (income.data.pagos === 1 ? '1 pago' : `${income.data.pagos} pagos`)
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ClientList
          title="Vencidos"
          tone="vencido"
          empty="No hay clientes vencidos."
          loading={loadingClients}
          items={vencidos}
        />
        <ClientList
          title="Por vencer"
          tone="por_vencer"
          empty="No hay clientes por vencer."
          loading={loadingClients}
          items={porVencer}
        />
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  detail,
  dark = false,
}: {
  icon: LucideIcon
  label: string
  value: string
  detail?: ReactNode
  dark?: boolean
}) {
  return (
    <Card className={cn(dark && 'bg-sidebar text-sidebar-foreground ring-sidebar-border')}>
      <CardContent className="flex items-center gap-4">
        <span
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-xl',
            dark ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground',
          )}
          aria-hidden
        >
          <Icon className="size-6" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className={cn('text-sm', dark ? 'text-white/60' : 'text-muted-foreground')}>
            {label}
          </span>
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span
              className={cn(
                'font-heading text-3xl font-bold tracking-tight',
                dark && 'text-primary',
              )}
            >
              {value}
            </span>
            {detail && (
              <span className={cn('text-sm', dark ? 'text-white/60' : 'text-muted-foreground')}>
                {detail}
              </span>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function ClientList({
  title,
  empty,
  loading,
  items,
  tone,
}: {
  title: string
  empty: string
  loading: boolean
  items: ClientWithStatus[]
  tone: 'vencido' | 'por_vencer'
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          {!loading && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-semibold',
                tone === 'vencido' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800',
              )}
            >
              {items.length}
            </span>
          )}
        </CardTitle>
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
      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
    >
      <MessageCircle />
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
