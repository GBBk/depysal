import { describe, expect, it } from 'vitest'
import {
  forecastSchema,
  summarizeToday,
  weatherAdvice,
  type DaySummary,
  type Forecast,
} from './advice'

type Hour = { time: string; temp: number; wind?: number; symbol?: string; rain?: number }

function forecast(hours: Hour[]): Forecast {
  return {
    properties: {
      timeseries: hours.map((h) => ({
        time: h.time,
        data: {
          instant: { details: { air_temperature: h.temp, wind_speed: h.wind ?? 2 } },
          next_1_hours: {
            summary: { symbol_code: h.symbol ?? 'clearsky_day' },
            details: { precipitation_amount: h.rain ?? 0 },
          },
        },
      })),
    },
  }
}

// 25/11/2026 a las 10:30 en Argentina (UTC-3).
const now = new Date('2026-11-25T13:30:00Z')

describe('summarizeToday', () => {
  it('usa solo lo que queda de hoy en Argentina, desde la hora actual', () => {
    const day = summarizeToday(
      forecast([
        { time: '2026-11-25T11:00:00Z', temp: 40 }, // 8 h: ya pasó
        { time: '2026-11-25T13:00:00Z', temp: 25, wind: 5 }, // 10 h: la hora actual
        { time: '2026-11-25T18:00:00Z', temp: 33, rain: 0.4 },
        { time: '2026-11-26T02:00:00Z', temp: 20, rain: 0.3 }, // 23 h: sigue siendo hoy
        { time: '2026-11-26T03:00:00Z', temp: 10, rain: 5 }, // 0 h del 26: mañana
      ]),
      now,
    )
    expect(day).toEqual({
      current: 25,
      max: 33,
      min: 20,
      maxWindKmh: 18,
      precipitationMm: 0.7,
      symbols: ['clearsky_day', 'clearsky_day', 'clearsky_day'],
    })
  })

  it('sin horas de hoy devuelve null', () => {
    expect(summarizeToday(forecast([{ time: '2026-11-26T12:00:00Z', temp: 20 }]), now)).toBeNull()
  })

  it('acepta horas sin next_1_hours (el tramo de 6 h del pronóstico)', () => {
    const f = forecast([{ time: '2026-11-25T15:00:00Z', temp: 22 }])
    delete f.properties.timeseries[0].data.next_1_hours
    expect(summarizeToday(f, now)).toMatchObject({ max: 22, symbols: [], precipitationMm: 0 })
  })
})

describe('forecastSchema', () => {
  it('se queda con lo que usamos de la respuesta real', () => {
    const real = {
      type: 'Feature',
      properties: {
        meta: { updated_at: '2026-11-25T15:58:57Z' },
        timeseries: [
          {
            time: '2026-11-25T15:00:00Z',
            data: {
              instant: {
                details: { air_temperature: 26.4, wind_speed: 1.3, relative_humidity: 43 },
              },
              next_1_hours: {
                summary: { symbol_code: 'clearsky_day' },
                details: { precipitation_amount: 0 },
              },
              next_6_hours: { summary: { symbol_code: 'fair_day' }, details: {} },
            },
          },
        ],
      },
    }
    expect(forecastSchema.parse(real).properties.timeseries[0]).toEqual({
      time: '2026-11-25T15:00:00Z',
      data: {
        instant: { details: { air_temperature: 26.4, wind_speed: 1.3 } },
        next_1_hours: {
          summary: { symbol_code: 'clearsky_day' },
          details: { precipitation_amount: 0 },
        },
      },
    })
  })

  it('rechaza una respuesta sin temperatura', () => {
    const roto = { properties: { timeseries: [{ time: 'x', data: { instant: { details: {} } } }] } }
    expect(forecastSchema.safeParse(roto).success).toBe(false)
  })
})

describe('weatherAdvice', () => {
  const nice: DaySummary = {
    current: 20,
    max: 24,
    min: 15,
    maxWindKmh: 10,
    precipitationMm: 0,
    symbols: ['fair_day'],
  }

  it('mucho calor: el mensaje de la botella con agua', () => {
    expect(weatherAdvice({ ...nice, max: 34 })).toEqual({
      kind: 'hot',
      message: 'El día de hoy va a estar pesadito: recordá traer tu botella con agua.',
    })
  })

  it('cada clima tiene su recomendación', () => {
    const casos: [Partial<DaySummary>, string][] = [
      [{ symbols: ['heavyrainandthunder'] }, 'storm'],
      [{ symbols: ['lightrain'] }, 'rain'],
      [{ precipitationMm: 1.5 }, 'rain'],
      [{ maxWindKmh: 45 }, 'wind'],
      [{ max: 10 }, 'cold'],
      [{ max: 28 }, 'warm'],
      [{}, 'nice'],
    ]
    for (const [cambio, kind] of casos) {
      expect(weatherAdvice({ ...nice, ...cambio }).kind, kind).toBe(kind)
    }
  })

  it('prioridad: tormenta > lluvia > calor fuerte > viento > frío > calor', () => {
    expect(weatherAdvice({ ...nice, max: 35, symbols: ['rainandthunder'] }).kind).toBe('storm')
    expect(weatherAdvice({ ...nice, max: 35, symbols: ['rain'] }).kind).toBe('rain')
    expect(weatherAdvice({ ...nice, max: 35, maxWindKmh: 50 }).kind).toBe('hot')
    expect(weatherAdvice({ ...nice, max: 10, maxWindKmh: 50 }).kind).toBe('wind')
    expect(weatherAdvice({ ...nice, max: 28, maxWindKmh: 50 }).kind).toBe('wind')
  })

  it('llovizna de menos de 1 mm sin símbolo de lluvia no cuenta como lluvia', () => {
    expect(weatherAdvice({ ...nice, precipitationMm: 0.5 }).kind).toBe('nice')
  })
})
