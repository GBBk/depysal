import { useQuery } from '@tanstack/react-query'
import { WEATHER_URL, forecastSchema } from './advice'

/**
 * Pronóstico de Arroyito (MET Norway). Pedido "simple" de CORS, sin headers propios: así lo
 * permite MET Norway a sitios de poco tráfico (se identifica con el Origin del navegador).
 * Se pide como máximo cada 30 minutos; si falla, el inicio no muestra el clima.
 */
export function useWeather() {
  return useQuery({
    queryKey: ['weather'],
    queryFn: async () => {
      const res = await fetch(WEATHER_URL)
      if (!res.ok) throw new Error(`Clima: HTTP ${res.status}`)
      const body: unknown = await res.json()
      return forecastSchema.parse(body)
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
}
