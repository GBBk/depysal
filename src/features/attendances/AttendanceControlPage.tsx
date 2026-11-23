import { CircleAlert, CircleCheck, CircleX, IdCard, type LucideIcon } from 'lucide-react'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '@/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ClientAvatar } from '@/features/clients/ClientAvatar'
import { formatTime, todayISO } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCheckIn, useDayAttendances } from './api'
import { describeCheckIn, type CheckInMessage, type CheckInResult } from './checkIn'

/** Recepción: DNI + Enter registra la asistencia de hoy y muestra el resultado. */
export function AttendanceControlPage() {
  const [dni, setDni] = useState('')
  const [attempt, setAttempt] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const checkIn = useCheckIn()
  const fecha = todayISO()

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    inputRef.current?.focus()
    if (checkIn.isPending || !dni.trim()) return
    setAttempt((n) => n + 1)
    checkIn.mutate(dni, {
      // Si el DNI estaba mal escrito se deja para corregirlo; si no, queda listo para el próximo.
      onSuccess: (result) => {
        if (result.kind !== 'dni_invalido') setDni('')
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Asistencias"
        description="Escribí el DNI del cliente que llega y apretá Enter: se registra la asistencia de hoy."
      />

      <Card>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <IdCard
                className="pointer-events-none absolute top-1/2 left-4 size-6 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                ref={inputRef}
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                placeholder="DNI del cliente"
                aria-label="DNI del cliente"
                className="h-14 pl-13 text-2xl tracking-wider md:text-2xl"
              />
            </div>
            <Button
              type="submit"
              disabled={checkIn.isPending || !dni.trim()}
              className="h-14 px-8 text-base"
            >
              {checkIn.isPending ? 'Registrando…' : 'Registrar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div aria-live="polite" aria-atomic>
        {checkIn.isError && (
          <ResultBox
            key={attempt}
            message={{
              tone: 'error',
              title: 'No se pudo registrar',
              detail: 'Revisá la conexión y probá de nuevo.',
            }}
          />
        )}
        {checkIn.data && <CheckInResultBox key={attempt} result={checkIn.data} />}
      </div>

      <DayAttendances fecha={fecha} />
    </div>
  )
}

const tones: Record<CheckInMessage['tone'], { box: string; icon: LucideIcon; iconColor: string }> =
  {
    ok: {
      box: 'border-emerald-300 bg-emerald-50 text-emerald-950',
      icon: CircleCheck,
      iconColor: 'text-emerald-600',
    },
    warn: {
      box: 'border-amber-300 bg-amber-50 text-amber-950',
      icon: CircleAlert,
      iconColor: 'text-amber-600',
    },
    error: {
      box: 'border-red-300 bg-red-50 text-red-950',
      icon: CircleX,
      iconColor: 'text-red-600',
    },
  }

function CheckInResultBox({ result }: { result: CheckInResult }) {
  const client = 'client' in result ? result.client : null
  return (
    <ResultBox
      message={describeCheckIn(result)}
      client={
        client && (
          <Link to={`/admin/clientes/${client.id}`} className="hover:underline">
            {client.nombre} {client.apellido}
          </Link>
        )
      }
    />
  )
}

function ResultBox({ message, client }: { message: CheckInMessage; client?: ReactNode }) {
  const tone = tones[message.tone]
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-xl border-2 p-5 duration-200 animate-in fade-in zoom-in-95 motion-reduce:animate-none sm:flex-row sm:items-center',
        tone.box,
      )}
    >
      <tone.icon className={cn('size-12 shrink-0', tone.iconColor)} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {client && <p className="text-lg font-semibold">{client}</p>}
        <p className="font-heading text-2xl font-bold">{message.title}</p>
        <p className="text-base">{message.detail}</p>
      </div>
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
          Asistencias de hoy
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
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatTime(attendance.created_at)}
        </span>
      </div>
    </li>
  )
}
