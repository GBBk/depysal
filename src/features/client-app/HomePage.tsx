import { CalendarClock, ChevronRight, ClipboardList } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import { useProfile } from '@/features/auth/api'
import { StatusBadge } from '@/features/clients/StatusBadge'
import { WeatherCard } from '@/features/weather/WeatherCard'
import { formatDate } from '@/lib/format'
import { useMyRoutine, useMyStatus, useMyWaitingPeriods } from './api'

/** Inicio del cliente (SPEC §2.9): estado de cuota, plan, vigencia, clases y período en espera. */
export function HomePage() {
  const profile = useProfile()
  const status = useMyStatus()
  const waiting = useMyWaitingPeriods()
  const routine = useMyRoutine()

  const s = status.data
  const vigente = s?.plan_nombre && s.hasta

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        Hola{profile.data ? `, ${profile.data.nombre}` : ''}
      </h1>

      <WeatherCard />
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">Tu cuota</span>
            {s && <StatusBadge estado={s.estado} />}
          </div>
          {status.isPending && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {status.isError && (
            <p className="text-sm text-destructive">No se pudo cargar tu estado.</p>
          )}
          {s && !vigente && (
            <p className="text-sm">
              No tenés un plan vigente. Acercate a recepción para renovar tu cuota.
            </p>
          )}
          {s && vigente && (
            <dl className="grid grid-cols-2 gap-3">
              <Fact label="Plan" wide>
                {s.plan_nombre}
              </Fact>
              <Fact label="Vigente hasta">{formatDate(s.hasta ?? '')}</Fact>
              <Fact label="Clases restantes">
                {s.clases_restantes === null ? 'Ilimitadas' : s.clases_restantes}
              </Fact>
            </dl>
          )}
          {s?.estado === 'por_vencer' && !s.tiene_periodo_en_espera && (
            <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
              Tu plan está por vencer. Acordate de renovarlo en recepción.
            </p>
          )}
          {waiting.data && waiting.data.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
              <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Ya tenés pago el próximo período ({waiting.data[0].plan_nombre}): empieza el{' '}
                {formatDate(waiting.data[0].desde)}.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Link
        to="/app/rutina"
        className="flex items-center gap-3 rounded-xl bg-sidebar p-4 text-sidebar-foreground transition-opacity hover:opacity-90"
      >
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          aria-hidden
        >
          <ClipboardList className="size-6" />
        </span>
        <span className="flex flex-1 flex-col">
          <span className="font-semibold">Mi rutina</span>
          <span className="text-sm text-white/60">
            {routine.data ? routine.data.nombre : routine.isPending ? '…' : 'Todavía sin rutina'}
          </span>
        </span>
        <ChevronRight className="size-5 text-primary" aria-hidden />
      </Link>
    </div>
  )
}

function Fact({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-heading text-lg font-semibold">{children}</dd>
    </div>
  )
}
