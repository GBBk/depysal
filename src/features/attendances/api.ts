import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

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
 * (`['attendances']` entero, así también la lista de asistencias de hoy).
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

/**
 * Asistencias de un día con el nombre del cliente, la última primero. Se refresca sola: los
 * clientes se anotan desde el kiosco, en otro dispositivo.
 */
export function useDayAttendances(fecha: string) {
  return useQuery({
    queryKey: ['attendances', 'day', fecha],
    refetchInterval: 30_000,
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
