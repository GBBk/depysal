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

/** Una asistencia cambia las clases usadas y el estado: se refresca todo lo que depende de ella. */
function invalidateClientAttendances(queryClient: QueryClient, clientId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['attendances', clientId] }),
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
