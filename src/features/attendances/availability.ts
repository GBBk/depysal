// Si hoy se puede registrar una asistencia, según client_status (no se recalcula nada acá).
// La base igual lo valida (trigger check_attendance_allowed) para cualquier fecha.

export type StatusForAttendance = {
  periodo_actual: number | null
  clases_restantes: number | null
  tiene_periodo_en_espera: boolean | null
}

export type Availability =
  | { kind: 'ok'; restantes: number }
  | { kind: 'debe_abonar' }
  | { kind: 'sin_clases_hoy' } // usó la última clase hoy y ya pagó el período siguiente
  | { kind: 'pase_libre' }

export function attendanceAvailability(status: StatusForAttendance): Availability {
  if (status.periodo_actual === null) {
    return status.tiene_periodo_en_espera ? { kind: 'sin_clases_hoy' } : { kind: 'debe_abonar' }
  }
  if (status.clases_restantes === null) return { kind: 'pase_libre' }
  if (status.clases_restantes > 0) return { kind: 'ok', restantes: status.clases_restantes }
  return status.tiene_periodo_en_espera ? { kind: 'sin_clases_hoy' } : { kind: 'debe_abonar' }
}

/** Mensaje para el error que devuelve la base al registrar una asistencia. */
export function attendanceErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const { message, code } = error as { message?: unknown; code?: unknown }
    if (message === 'debe_abonar')
      return 'Debe abonar: no tiene un período con clases en esa fecha.'
    if (message === 'pase_libre') return 'Tiene pase libre: no hace falta registrar asistencias.'
    if (code === '23505') return 'Ya tiene una asistencia registrada ese día.'
  }
  return 'No se pudo registrar la asistencia. Probá de nuevo.'
}
