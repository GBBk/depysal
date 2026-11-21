import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toPaymentInsert, type PaymentValues } from './schemas'

export function useClientPayments(clientId: string) {
  return useQuery({
    queryKey: ['payments', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('id, fecha_pago, monto, medio, anulado, clases, plans(nombre)')
        .eq('client_id', clientId)
        .order('fecha_pago', { ascending: false })
        .order('id', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export type PaymentRow = NonNullable<ReturnType<typeof useClientPayments>['data']>[number]

/** Períodos calculados por la base (client_periods). */
export function useClientPeriods(clientId: string) {
  return useQuery({
    queryKey: ['periods', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('client_periods', { p_client_id: clientId })
      if (error) throw error
      return data
    },
  })
}

/** Un pago cambia los períodos y el estado de cuota: se refresca todo lo que depende de él. */
function invalidateClientPayments(queryClient: QueryClient, clientId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['payments', clientId] }),
    queryClient.invalidateQueries({ queryKey: ['periods', clientId] }),
    queryClient.invalidateQueries({ queryKey: ['client-status'] }),
    queryClient.invalidateQueries({ queryKey: ['payments', 'monthly-income'] }),
  ])
}

export function useCreatePayment(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: PaymentValues) => {
      const { error } = await supabase.from('payments').insert(toPaymentInsert(clientId, values))
      if (error) throw error
    },
    onSuccess: () => invalidateClientPayments(queryClient, clientId),
  })
}

/** Anula un pago cargado por error. Los pagos nunca se borran. */
export function useAnnulPayment(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (paymentId: number) => {
      const { error } = await supabase
        .from('payments')
        .update({ anulado: true })
        .eq('id', paymentId)
      if (error) throw error
    },
    onSuccess: () => invalidateClientPayments(queryClient, clientId),
  })
}
