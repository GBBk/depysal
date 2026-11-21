import { Button } from '@/components/ui/button'
import { todayISO } from '@/lib/format'
import { useRegisterAttendance } from './api'
import {
  attendanceAvailability,
  attendanceErrorMessage,
  type StatusForAttendance,
} from './availability'
import { AvailabilityNote } from './AvailabilityNote'

/** Registrar la asistencia de hoy en un clic (buscador del panel). */
export function QuickAttendance({
  clientId,
  status,
}: {
  clientId: string
  status: StatusForAttendance
}) {
  const register = useRegisterAttendance(clientId)
  const availability = attendanceAvailability(status)

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <AvailabilityNote availability={availability} />
        {availability.kind === 'ok' && (
          <Button
            size="sm"
            disabled={register.isPending}
            onClick={() => register.mutate(todayISO())}
          >
            {register.isPending ? 'Registrando…' : 'Registrar asistencia'}
          </Button>
        )}
      </div>
      {register.isError && (
        <p role="alert" className="text-sm text-destructive">
          {attendanceErrorMessage(register.error)}
        </p>
      )}
    </div>
  )
}
