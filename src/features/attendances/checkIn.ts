// Control de asistencias por DNI (recepción): qué hacer con el cliente que llega y qué mostrar.
// La base igual valida todo (trigger check_attendance_allowed y UNIQUE por día).

import { formatDate } from '@/lib/format'
import { attendanceAvailability, type StatusForAttendance } from './availability'

/** DNI como lo guarda la base (7 u 8 números). Acepta puntos y espacios. */
export function normalizeDni(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  return /^\d{7,8}$/.test(digits) ? digits : null
}

export type CheckInStatus = StatusForAttendance & { hasta: string | null }

type Blocked = 'ya_registrada' | 'debe_abonar' | 'sin_clases_hoy' | 'pase_libre'

export type CheckInDecision = { action: 'registrar'; restantes: number } | { action: Blocked }

/** Con el estado de hoy (client_status) y si ya tiene la asistencia de hoy. */
export function checkInDecision(status: StatusForAttendance, yaVinoHoy: boolean): CheckInDecision {
  // Primero: si ya vino, su estado ya descuenta la clase de hoy (podría decir "Debe abonar").
  if (yaVinoHoy) return { action: 'ya_registrada' }
  const availability = attendanceAvailability(status)
  return availability.kind === 'ok'
    ? { action: 'registrar', restantes: availability.restantes }
    : { action: availability.kind }
}

export type CheckInClient = { id: string; nombre: string; apellido: string }

export type CheckInResult =
  | { kind: 'dni_invalido' }
  | { kind: 'no_encontrado'; dni: string }
  | { kind: 'inactivo'; client: CheckInClient }
  | {
      kind: 'registrada'
      client: CheckInClient
      status: CheckInStatus
      /** Clases que le quedan después de la de hoy. */
      restantes: number
    }
  | { kind: Blocked; client: CheckInClient; status: CheckInStatus }

export type CheckInMessage = { tone: 'ok' | 'warn' | 'error'; title: string; detail: string }

function clases(n: number): string {
  return n === 1 ? 'Le queda 1 clase' : `Le quedan ${n} clases`
}

function vence(hasta: string | null): string {
  return hasta ? ` · vence el ${formatDate(hasta)}` : ''
}

export function describeCheckIn(result: CheckInResult): CheckInMessage {
  switch (result.kind) {
    case 'dni_invalido':
      return {
        tone: 'error',
        title: 'DNI inválido',
        detail: 'El DNI son 7 u 8 números.',
      }
    case 'no_encontrado':
      return {
        tone: 'error',
        title: 'DNI no encontrado',
        detail: `No hay ningún cliente con el DNI ${result.dni}.`,
      }
    case 'inactivo':
      return {
        tone: 'error',
        title: 'Cliente dado de baja',
        detail: 'Reactivá al cliente desde su ficha para registrarle asistencias.',
      }
    case 'registrada':
      return {
        tone: 'ok',
        title: 'Asistencia registrada',
        detail:
          result.restantes > 0
            ? `${clases(result.restantes)}${vence(result.status.hasta)}`
            : result.status.tiene_periodo_en_espera
              ? 'Era su última clase. El próximo período ya está pago.'
              : 'Era su última clase: para la próxima tiene que abonar.',
      }
    case 'ya_registrada':
      return {
        tone: 'warn',
        title: 'Ya tenía la asistencia de hoy',
        detail: 'No se descontó otra clase.',
      }
    case 'debe_abonar':
      return {
        tone: 'error',
        title: 'Debe abonar',
        detail: 'No tiene un período vigente con clases. No se registró la asistencia.',
      }
    case 'sin_clases_hoy':
      return {
        tone: 'warn',
        title: 'Sin clases hoy',
        detail: 'Ya usó las clases de este período; el próximo ya está pago.',
      }
    case 'pase_libre':
      return {
        tone: 'ok',
        title: 'Pase libre: puede pasar',
        detail: `No hace falta registrar asistencias${vence(result.status.hasta)}.`,
      }
  }
}
