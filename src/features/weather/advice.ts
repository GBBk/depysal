// Clima de hoy en Arroyito y una recomendación para entrenar (pedido del usuario, SPEC §2.9).
// Datos: MET Norway Locationforecast 2.0 (CC BY 4.0, gratis también para uso comercial).

import { z } from 'zod'
import { todayISO } from '@/lib/format'

/** Arroyito, Córdoba (4 decimales como máximo, lo pide MET Norway). */
export const WEATHER_URL =
  'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=-31.4192&lon=-63.0508'

/** Solo lo que usamos de la respuesta; zod descarta el resto. */
export const forecastSchema = z.object({
  properties: z.object({
    timeseries: z.array(
      z.object({
        time: z.string(),
        data: z.object({
          instant: z.object({
            details: z.object({ air_temperature: z.number(), wind_speed: z.number() }),
          }),
          next_1_hours: z
            .object({
              summary: z.object({ symbol_code: z.string() }),
              details: z.object({ precipitation_amount: z.number().optional() }),
            })
            .optional(),
        }),
      }),
    ),
  }),
})

export type Forecast = z.infer<typeof forecastSchema>

export type DaySummary = {
  /** Temperatura de la hora actual. */
  current: number
  max: number
  min: number
  /** Viento medio máximo en km/h (la API lo da en m/s). */
  maxWindKmh: number
  precipitationMm: number
  symbols: string[]
}

/** Resume lo que queda del día de hoy (hora de Argentina), desde la hora actual. */
export function summarizeToday(forecast: Forecast, now: Date = new Date()): DaySummary | null {
  const today = todayISO(now)
  const fromHour = now.getTime() - 60 * 60 * 1000
  const hours = forecast.properties.timeseries.filter((entry) => {
    const time = new Date(entry.time)
    return todayISO(time) === today && time.getTime() > fromHour
  })
  if (hours.length === 0) return null

  const temps = hours.map((h) => h.data.instant.details.air_temperature)
  return {
    current: temps[0],
    max: Math.max(...temps),
    min: Math.min(...temps),
    maxWindKmh: Math.max(...hours.map((h) => h.data.instant.details.wind_speed)) * 3.6,
    precipitationMm: hours.reduce(
      (sum, h) => sum + (h.data.next_1_hours?.details.precipitation_amount ?? 0),
      0,
    ),
    symbols: hours.flatMap((h) =>
      h.data.next_1_hours ? [h.data.next_1_hours.summary.symbol_code] : [],
    ),
  }
}

export type AdviceKind = 'storm' | 'rain' | 'hot' | 'wind' | 'cold' | 'warm' | 'nice'

export type Advice = { kind: AdviceKind; message: string }

export const THRESHOLDS = {
  /** mm en lo que queda del día para considerar que llueve. */
  rainMm: 1,
  hotC: 32,
  warmC: 27,
  coldC: 12,
  windKmh: 40,
} as const

/** Una sola recomendación, la más importante (en este orden). */
export function weatherAdvice(day: DaySummary): Advice {
  const has = (word: string) => day.symbols.some((s) => s.includes(word))

  if (has('thunder')) {
    return {
      kind: 'storm',
      message: 'Hoy se esperan tormentas: fijate el cielo antes de salir y vení con cuidado.',
    }
  }
  if (has('rain') || has('sleet') || has('snow') || day.precipitationMm >= THRESHOLDS.rainMm) {
    return {
      kind: 'rain',
      message: 'Hoy llueve: traé paraguas y una toalla extra. ¡Adentro no llueve!',
    }
  }
  if (day.max >= THRESHOLDS.hotC) {
    return {
      kind: 'hot',
      message: 'El día de hoy va a estar pesadito: recordá traer tu botella con agua.',
    }
  }
  if (day.maxWindKmh >= THRESHOLDS.windKmh) {
    return { kind: 'wind', message: 'Hoy hay mucho viento: vení con cuidado.' }
  }
  if (day.max <= THRESHOLDS.coldC) {
    return {
      kind: 'cold',
      message: 'Hoy hace frío: vení con abrigo y entrá bien en calor antes de entrenar.',
    }
  }
  if (day.max >= THRESHOLDS.warmC) {
    return {
      kind: 'warm',
      message: 'Hace calor: hidratate antes, durante y después de entrenar.',
    }
  }
  return { kind: 'nice', message: 'Lindo día para entrenar. ¡Te esperamos!' }
}
