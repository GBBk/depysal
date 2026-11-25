import {
  CloudLightning,
  CloudRain,
  Smile,
  Snowflake,
  Sun,
  ThermometerSun,
  Wind,
  type LucideIcon,
} from 'lucide-react'
import { summarizeToday, weatherAdvice, type AdviceKind } from './advice'
import { useWeather } from './api'

const ICONS: Record<AdviceKind, LucideIcon> = {
  storm: CloudLightning,
  rain: CloudRain,
  hot: ThermometerSun,
  wind: Wind,
  cold: Snowflake,
  warm: Sun,
  nice: Smile,
}

/**
 * Recomendación según el clima de hoy en Arroyito. Si el pronóstico no carga, no se muestra.
 * El crédito que pide la licencia de MET Norway está en Cuenta (`WeatherCredit`).
 */
export function WeatherCard() {
  const weather = useWeather()
  const day = weather.data ? summarizeToday(weather.data) : null
  if (!day) return null

  const advice = weatherAdvice(day)
  const Icon = ICONS[advice.kind]

  return (
    <section
      aria-label="Clima de hoy"
      className="flex items-start gap-3 rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10"
    >
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"
        aria-hidden
      >
        <Icon className="size-6" />
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">
          Hoy en Arroyito · ahora {Math.round(day.current)}° · máx {Math.round(day.max)}°
        </span>
        <p className="font-medium">{advice.message}</p>
      </div>
    </section>
  )
}
