import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { kioskResultSchema, type KioskResult } from './result'

/**
 * Registra la asistencia de hoy del DNI. La función de la base decide todo (y solo la puede
 * llamar el kiosco); lo que no se registra vuelve como resultado, no como error.
 */
export function useKioskCheckIn() {
  return useMutation({
    mutationFn: async (dni: string): Promise<KioskResult> => {
      const { data, error } = await supabase.rpc('kiosk_check_in', { p_dni: dni })
      if (error) throw error
      // Los tipos generados no marcan las columnas como nullable: se valida la respuesta.
      const rows: unknown = data
      return kioskResultSchema.array().length(1).parse(rows)[0]
    },
  })
}
