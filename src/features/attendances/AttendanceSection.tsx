import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate, todayISO } from '@/lib/format'
import { useClientAttendances, useDeleteAttendance, useRegisterAttendance } from './api'
import {
  attendanceAvailability,
  attendanceErrorMessage,
  type StatusForAttendance,
} from './availability'
import { AvailabilityNote } from './AvailabilityNote'

/** Asistencias en la ficha: registrar (hoy por defecto), historial y anular. */
export function AttendanceSection({
  clientId,
  status,
}: {
  clientId: string
  status: StatusForAttendance
}) {
  const [fecha, setFecha] = useState(todayISO)
  const register = useRegisterAttendance(clientId)
  const remove = useDeleteAttendance(clientId)
  const attendances = useClientAttendances(clientId)

  const availability = attendanceAvailability(status)
  // Para hoy se sabe de antemano si puede (client_status); para otra fecha decide la base.
  const blockedToday = fecha === todayISO() && availability.kind !== 'ok'

  const onRemove = (id: number, f: string) => {
    if (window.confirm(`¿Anular la asistencia del ${formatDate(f)}?`)) {
      remove.mutate(id, { onSuccess: () => register.reset() })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">Hoy</span>
        <AvailabilityNote availability={availability} />
      </div>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          register.mutate(fecha)
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="asistencia-fecha">Fecha</Label>
          <Input
            id="asistencia-fecha"
            type="date"
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value)
              register.reset()
            }}
            required
          />
        </div>
        <Button type="submit" disabled={blockedToday || !fecha || register.isPending}>
          {register.isPending ? 'Registrando…' : 'Registrar asistencia'}
        </Button>
      </form>
      {register.isError && (
        <p role="alert" className="text-sm text-destructive">
          {attendanceErrorMessage(register.error)}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Historial</span>
        {attendances.isPending && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {attendances.isError && (
          <p className="text-sm text-destructive">No se pudieron cargar las asistencias.</p>
        )}
        {attendances.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay asistencias.</p>
        )}
        {remove.isError && (
          <p role="alert" className="text-sm text-destructive">
            No se pudo anular la asistencia. Probá de nuevo.
          </p>
        )}
        <ul className="divide-y text-sm">
          {attendances.data?.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-1">
              {formatDate(a.fecha)}
              <Button
                variant="ghost"
                size="sm"
                disabled={remove.isPending}
                onClick={() => onRemove(a.id, a.fecha)}
              >
                Anular
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
