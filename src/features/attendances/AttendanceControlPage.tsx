import { Link } from 'react-router'
import { PageHeader } from '@/app/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientAvatar } from '@/features/clients/ClientAvatar'
import { formatTime, todayISO } from '@/lib/format'
import { useDayAttendances } from './api'

/** Quién vino hoy. Los clientes se anotan en el kiosco (/kiosco); un error se anula en la ficha. */
export function AttendanceControlPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Asistencias de hoy"
        description="Los clientes se anotan con su DNI en el kiosco de recepción. Si alguien se anotó por error, anulalo desde su ficha."
      />
      <DayAttendances fecha={todayISO()} />
    </div>
  )
}

type DayAttendance = NonNullable<ReturnType<typeof useDayAttendances>['data']>[number]

function DayAttendances({ fecha }: { fecha: string }) {
  const day = useDayAttendances(fecha)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 before:h-4 before:w-1 before:rounded-full before:bg-primary">
          Vinieron hoy
          {day.data && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
              {day.data.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {day.isPending && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {day.isError && (
          <p className="text-sm text-destructive">No se pudieron cargar las asistencias.</p>
        )}
        {day.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no vino nadie hoy.</p>
        )}
        {day.data && day.data.length > 0 && (
          <ul className="divide-y">
            {day.data.map((a) => (
              <DayAttendanceRow key={a.id} attendance={a} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function DayAttendanceRow({ attendance }: { attendance: DayAttendance }) {
  const { cliente } = attendance
  const nombre = cliente ? `${cliente.apellido}, ${cliente.nombre}` : 'Cliente'

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        {cliente && <ClientAvatar nombre={cliente.nombre} apellido={cliente.apellido} />}
        <Link
          to={`/admin/clientes/${attendance.client_id}`}
          className="truncate font-medium hover:underline"
        >
          {nombre}
        </Link>
      </div>
      <span className="text-sm text-muted-foreground tabular-nums">
        {formatTime(attendance.created_at)}
      </span>
    </li>
  )
}
