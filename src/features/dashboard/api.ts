import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { monthRange, todayISO } from '@/lib/format'

/** Suma de los pagos no anulados del mes en curso (Argentina). */
export function useMonthlyIncome() {
  const { desde, hasta } = monthRange(todayISO())
  return useQuery({
    queryKey: ['payments', 'monthly-income', desde],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('monto')
        .eq('anulado', false)
        .gte('fecha_pago', desde)
        .lte('fecha_pago', hasta)
      if (error) throw error
      return { total: data.reduce((sum, p) => sum + p.monto, 0), pagos: data.length }
    },
  })
}
