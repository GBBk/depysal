import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { todayISO } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { checkInDecision, normalizeDni, type CheckInResult } from './checkIn'

export function useClientAttendances(clientId: string) {
  return useQuery({
    queryKey: ['attendances', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendances')
        .select('id, fecha')
        .eq('client_id', clientId)
        .order('fecha', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/**
 * Una asistencia cambia las clases usadas y el estado: se refresca todo lo que depende de ella
 * (`['attendances']` entero, así también la lista de hoy del control de asistencias).
 */
function invalidateClientAttendances(queryClient: QueryClient, clientId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['attendances'] }),
    queryClient.invalidateQueries({ queryKey: ['periods', clientId] }),
    queryClient.invalidateQueries({ queryKey: ['client-status'] }),
  ])
}

/** La base rechaza la asistencia con 'debe_abonar' o 'pase_libre' (ver attendanceErrorMessage). */
export function useRegisterAttendance(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (fecha: string) => {
      const { error } = await supabase.from('attendances').insert({ client_id: clientId, fecha })
      if (error) throw error
    },
    onSuccess: () => invalidateClientAttendances(queryClient, clientId),
  })
}

/** Anular una asistencia cargada por error = borrarla. */
export function useDeleteAttendance(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (attendanceId: number) => {
      const { error } = await supabase.from('attendances').delete().eq('id', attendanceId)
      if (error) throw error
    },
    onSuccess: () => invalidateClientAttendances(queryClient, clientId),
  })
}

/** Asistencias de un día con el nombre del cliente (control de asistencias), la última primero. */
export function useDayAttendances(fecha: string) {
  return useQuery({
    queryKey: ['attendances', 'day', fecha],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendances')
        .select(
          'id, client_id, created_at, cliente:profiles!attendances_client_id_fkey(nombre, apellido)',
        )
        .eq('fecha', fecha)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/**
 * Recepción: busca al cliente por DNI y, si puede, registra la asistencia de hoy.
 * Lo que no se registra (debe abonar, pase libre, ya vino…) vuelve como resultado, no como error.
 */
export function useCheckIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: string): Promise<CheckInResult> => {
      const dni = normalizeDni(input)
      if (!dni) return { kind: 'dni_invalido' }

      const found = await supabase
        .from('profiles')
        .select('id, nombre, apellido, activo')
        .eq('rol', 'client')
        .eq('dni', dni)
        .maybeSingle()
      if (found.error) throw found.error
      if (!found.data) return { kind: 'no_encontrado', dni }
      const { activo, ...client } = found.data
      if (!activo) return { kind: 'inactivo', client }

      const fecha = todayISO()
      const [statusRes, todayRes] = await Promise.all([
        supabase
          .from('client_status')
          .select('periodo_actual, clases_restantes, tiene_periodo_en_espera, hasta')
          .eq('client_id', client.id)
          .single(),
        supabase
          .from('attendances')
          .select('id')
          .eq('client_id', client.id)
          .eq('fecha', fecha)
          .maybeSingle(),
      ])
      if (statusRes.error) throw statusRes.error
      if (todayRes.error) throw todayRes.error
      const status = statusRes.data

      const decision = checkInDecision(status, todayRes.data !== null)
      if (decision.action !== 'registrar') return { kind: decision.action, client, status }

      const inserted = await supabase.from('attendances').insert({ client_id: client.id, fecha })
      if (inserted.error) {
        // Otra persona la registró recién, o la base la rechazó (trigger).
        if (inserted.error.code === '23505') return { kind: 'ya_registrada', client, status }
        if (inserted.error.message === 'debe_abonar') return { kind: 'debe_abonar', client, status }
        throw inserted.error
      }
      return {
        kind: 'registrada',
        client,
        status,
        restantes: decision.restantes - 1,
      }
    },
    onSuccess: (result) => {
      if (result.kind === 'registrada') {
        return invalidateClientAttendances(queryClient, result.client.id)
      }
    },
  })
}
