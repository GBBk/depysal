import { ChevronLeft, Pencil } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AttendanceSection } from '@/features/attendances/AttendanceSection'
import { useClientPeriods } from '@/features/payments/api'
import { PaymentForm } from '@/features/payments/PaymentForm'
import { PaymentsHistory } from '@/features/payments/PaymentsHistory'
import { formatDate, todayISO } from '@/lib/format'
import { ClientRoutineSection } from '@/features/routines/ClientRoutineSection'
import { cn } from '@/lib/utils'
import { useClient, useClientStatus, type ClientRow, type ClientStatus } from './api'
import { ClientAvatar } from './ClientAvatar'
import { StatusBadge } from './StatusBadge'

export function ClientDetailPage() {
  const { id } = useParams()
  const client = useClient(id)

  if (client.isPending) return <p className="text-sm text-muted-foreground">Cargando…</p>
  if (client.isError) return <p className="text-sm text-destructive">No se encontró el cliente.</p>
  return <ClientDetail client={client.data} />
}

function ClientDetail({ client }: { client: ClientRow }) {
  const status = useClientStatus(client.id)

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <Link
        to="/admin/clientes"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Clientes
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <ClientAvatar nombre={client.nombre} apellido={client.apellido} size="lg" />
          <div className="flex flex-col gap-1.5">
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              {client.nombre} {client.apellido}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge estado={status.data?.estado} />
              {!client.activo && <Badge variant="secondary">Inactivo</Badge>}
            </div>
          </div>
        </div>
        <Link
          to={`/admin/clientes/${client.id}/editar`}
          className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}
        >
          <Pencil />
          Editar datos
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Section title="Datos">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Item label="DNI">{client.dni}</Item>
            <Item label="Teléfono">{client.telefono}</Item>
            <Item label="Email">{client.email}</Item>
            <Item label="Notas">{client.notas}</Item>
          </dl>
        </Section>

        <Section title="Período actual">
          {status.isPending && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {status.isError && (
            <p className="text-sm text-destructive">No se pudo calcular el estado de cuota.</p>
          )}
          {status.data && <CurrentPeriod status={status.data} />}
          <WaitingPeriods clientId={client.id} />
        </Section>
      </div>

      {status.data && (
        <Section title="Asistencias">
          <AttendanceSection clientId={client.id} status={status.data} />
        </Section>
      )}

      <Section title="Rutina">
        <ClientRoutineSection clientId={client.id} clientName={client.nombre} />
      </Section>

      <Section title="Registrar pago">
        <PaymentForm clientId={client.id} />
      </Section>

      <Section title="Historial de pagos">
        <PaymentsHistory clientId={client.id} />
      </Section>
    </div>
  )
}

function CurrentPeriod({ status }: { status: ClientStatus }) {
  if (status.periodo_actual === null || !status.desde || !status.hasta) {
    return <p className="text-sm">Sin período vigente.</p>
  }
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      <Item label="Plan">{status.plan_nombre}</Item>
      <Item label="Vigencia">
        {formatDate(status.desde)} al {formatDate(status.hasta)}
      </Item>
      <Item label="Clases restantes">
        {status.clases_restantes === null
          ? 'Ilimitadas'
          : status.clases_restantes === 0
            ? 'Usó todas las clases'
            : status.clases_restantes}
      </Item>
    </dl>
  )
}

function WaitingPeriods({ clientId }: { clientId: string }) {
  const periods = useClientPeriods(clientId)
  const today = todayISO()
  const waiting = periods.data?.filter((p) => p.desde > today) ?? []
  if (waiting.length === 0) return null

  return (
    <div className="mt-4 flex flex-col gap-1 text-sm">
      <p className="font-medium">Períodos en espera</p>
      <ul className="list-disc pl-5">
        {waiting.map((p) => (
          <li key={p.payment_id}>
            {p.plan_nombre}: desde el {formatDate(p.desde)}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 before:h-4 before:w-1 before:rounded-full before:bg-primary">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="[overflow-wrap:anywhere]">{children || '—'}</dd>
    </div>
  )
}
