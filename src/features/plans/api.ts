import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toPlanUpdate, type PlanValues } from './schemas'

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('id, nombre, precio, clases, activo')
        .order('id')
      if (error) throw error
      return data
    },
  })
}

export type Plan = NonNullable<ReturnType<typeof usePlans>['data']>[number]

export function useUpdatePlan(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: PlanValues) => {
      const { error } = await supabase.from('plans').update(toPlanUpdate(values)).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  })
}

export function useSetPlanActive(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (activo: boolean) => {
      const { error } = await supabase.from('plans').update({ activo }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  })
}
