import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toSaveItems, type RoutineFormValues } from './schemas'

const itemColumns = 'id, dia, orden, exercise_id, series, reps, descanso_seg, notas'

/** Plantillas, con sus ítems (solo el día) para mostrar días y cantidad de ejercicios. */
export function useTemplates() {
  return useQuery({
    queryKey: ['routines', 'templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routines')
        .select('id, nombre, routine_items(dia)')
        .eq('es_plantilla', true)
        .order('nombre')
      if (error) throw error
      return data
    },
  })
}

export function useRoutine(id: number) {
  return useQuery({
    queryKey: ['routines', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routines')
        .select(
          `id, nombre, es_plantilla, client_id, activa,
           profiles(nombre, apellido), routine_items(${itemColumns})`,
        )
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })
}

export type Routine = NonNullable<ReturnType<typeof useRoutine>['data']>

/** Rutina activa del cliente con sus días hechos (para la ficha). null si no tiene. */
export function useClientRoutine(clientId: string) {
  return useQuery({
    queryKey: ['routines', 'client', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routines')
        .select('id, nombre, routine_items(dia), routine_completions(dia, fecha)')
        .eq('client_id', clientId)
        .eq('activa', true)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useCreateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('routines')
        .insert({ nombre: 'Nueva plantilla', es_plantilla: true })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routines'] }),
  })
}

/** Guarda nombre e ítems de una vez (función save_routine, atómica). */
export function useSaveRoutine(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: RoutineFormValues) => {
      const { error } = await supabase.rpc('save_routine', {
        p_routine_id: id,
        p_nombre: values.nombre.trim(),
        p_items: toSaveItems(values.items),
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routines'] }),
  })
}

/** Borra una rutina o plantilla (sus ítems y días hechos se borran en cascada). */
export function useDeleteRoutine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('routines').delete().eq('id', id)
      if (error) throw error
    },
    // No se recarga la rutina borrada (su editor sigue montado hasta que se navega).
    onSuccess: (_, id) =>
      queryClient.invalidateQueries({
        queryKey: ['routines'],
        predicate: (query) => query.queryKey[1] !== id,
      }),
  })
}

/**
 * Asigna una rutina al cliente (función assign_routine): copia la plantilla o crea una vacía.
 * La rutina que tenía activa pasa a inactiva. Devuelve el id de la rutina nueva.
 */
export function useAssignRoutine(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ templateId, nombre }: { templateId: number | null; nombre: string }) => {
      const { data, error } = await supabase.rpc('assign_routine', {
        p_client_id: clientId,
        ...(templateId === null ? {} : { p_template_id: templateId }),
        p_nombre: nombre.trim(),
      })
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routines'] }),
  })
}
