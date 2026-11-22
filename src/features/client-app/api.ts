import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth-context'
import { supabase } from '@/lib/supabase'
import { todayISO } from '@/lib/format'

// Vistas del cliente. El RLS solo le devuelve lo suyo: su estado, sus períodos, su rutina
// activa (nunca plantillas ni rutinas viejas) y sus días hechos.

function useUserId(): string {
  const { session } = useAuth()
  if (!session) throw new Error('Sin sesión')
  return session.user.id
}

export function useMyStatus() {
  const userId = useUserId()
  return useQuery({
    queryKey: ['me', userId, 'status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_status')
        .select('estado, plan_nombre, desde, hasta, clases_restantes, tiene_periodo_en_espera')
        .eq('client_id', userId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/** Períodos en espera (ya pagos, empiezan después de hoy). */
export function useMyWaitingPeriods() {
  const userId = useUserId()
  return useQuery({
    queryKey: ['me', userId, 'periods'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('client_periods', { p_client_id: userId })
      if (error) throw error
      const today = todayISO()
      return data.filter((p) => p.desde > today)
    },
  })
}

export function useMyRoutine() {
  const userId = useUserId()
  return useQuery({
    queryKey: ['me', userId, 'routine'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routines')
        .select(
          `id, nombre,
           routine_items(id, dia, orden, series, reps, descanso_seg, notas,
             exercises(id, nombre, grupo_muscular, equipo, instrucciones, imagenes, video_url)),
           routine_completions(id, dia, fecha)`,
        )
        .eq('activa', true)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export type MyRoutine = NonNullable<NonNullable<ReturnType<typeof useMyRoutine>['data']>>

/** "Hoy hice el Día X". No es una asistencia (esas las registra el admin). */
export function useMarkDayDone() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ routineId, dia }: { routineId: number; dia: string }) => {
      const { error } = await supabase
        .from('routine_completions')
        .insert({ routine_id: routineId, dia, fecha: todayISO() })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', userId, 'routine'] }),
  })
}

export function useUnmarkDay() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (completionId: number) => {
      const { error } = await supabase.from('routine_completions').delete().eq('id', completionId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', userId, 'routine'] }),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
    },
  })
}
