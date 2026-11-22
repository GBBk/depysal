import { CircleCheck, ExternalLink, Timer } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { usePhotoUrls } from '@/features/exercises/api'
import { routineDays } from '@/features/routines/schemas'
import { formatDate, todayISO } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useMarkDayDone, useMyRoutine, useUnmarkDay, type MyRoutine } from './api'
import { completionOn, lastDone, suggestedDay } from './logic'
import { PhotoCycle } from './PhotoCycle'

/** Mi rutina (SPEC §2.9): pestañas por día, ejercicios con fotos y marcar el día como hecho. */
export function MyRoutinePage() {
  const routine = useMyRoutine()

  if (routine.isPending) return <p className="text-sm text-muted-foreground">Cargando…</p>
  if (routine.isError) {
    return <p className="text-sm text-destructive">No se pudo cargar tu rutina.</p>
  }
  if (!routine.data) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Mi rutina</h1>
        <p className="text-sm text-muted-foreground">
          Todavía no tenés una rutina asignada. Pedísela a tu entrenador.
        </p>
      </div>
    )
  }
  return <Routine routine={routine.data} />
}

function Routine({ routine }: { routine: MyRoutine }) {
  const days: string[] = routineDays(routine.routine_items)
  const completions = routine.routine_completions
  // La pestaña sugerida se calcula una sola vez al entrar: si se recalculara, al marcar el día
  // la pantalla saltaría al siguiente y no se vería la confirmación.
  const [selected, setSelected] = useState(() => suggestedDay(days, completions))
  const day = selected && days.includes(selected) ? selected : days[0]
  const photos = usePhotoUrls(routine.routine_items.flatMap((i) => i.exercises.imagenes))

  const items = routine.routine_items.filter((i) => i.dia === day).sort((a, b) => a.orden - b.orden)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-bold tracking-tight">{routine.nombre}</h1>

      {days.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tu rutina todavía no tiene ejercicios.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Días">
            {days.map((d) => (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={d === day}
                onClick={() => setSelected(d)}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                  d === day
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card ring-1 ring-foreground/10 hover:ring-primary',
                )}
              >
                Día {d}
              </button>
            ))}
          </div>

          {day && (
            <section className="flex flex-col gap-3" role="tabpanel" aria-label={`Día ${day}`}>
              <DayDone routineId={routine.id} dia={day} completions={completions} />
              <ol className="flex flex-col gap-3">
                {items.map((item, i) => (
                  <li
                    key={item.id}
                    className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
                  >
                    <PhotoCycle
                      urls={item.exercises.imagenes.map((p) => photos.data?.get(p))}
                      alt={item.exercises.nombre}
                    />
                    <div className="flex flex-col gap-2 p-4">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-sidebar text-xs font-bold text-primary">
                          {i + 1}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-semibold leading-snug">
                            {item.exercises.nombre}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.exercises.grupo_muscular} · {item.exercises.equipo}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        <span className="font-heading text-xl font-bold">
                          {item.series} × {item.reps}
                        </span>
                        {item.descanso_seg !== null && (
                          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <Timer className="size-4" aria-hidden />
                            Descanso {item.descanso_seg} s
                          </span>
                        )}
                      </div>
                      {item.notas && (
                        <p className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
                          {item.notas}
                        </p>
                      )}
                      {item.exercises.instrucciones && (
                        <details className="text-sm">
                          <summary className="cursor-pointer font-medium text-foreground">
                            Cómo se hace
                          </summary>
                          <p className="mt-2 text-muted-foreground">
                            {item.exercises.instrucciones}
                          </p>
                        </details>
                      )}
                      {item.exercises.video_url && (
                        <a
                          href={item.exercises.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-accent-foreground underline-offset-4 hover:underline"
                        >
                          <ExternalLink className="size-4" aria-hidden />
                          Ver video
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </div>
  )
}

/** Marcar el día como hecho hoy (o deshacer) y cuándo lo hizo por última vez. */
function DayDone({
  routineId,
  dia,
  completions,
}: {
  routineId: number
  dia: string
  completions: { id: number; dia: string; fecha: string }[]
}) {
  const mark = useMarkDayDone()
  const unmark = useUnmarkDay()
  const today = todayISO()
  const doneToday = completionOn(completions, dia, today)
  const last = lastDone(completions, dia)
  const busy = mark.isPending || unmark.isPending

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      {doneToday ? (
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 font-semibold text-emerald-700">
            <CircleCheck className="size-5" aria-hidden />
            ¡Día {dia} hecho hoy!
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => unmark.mutate(doneToday.id)}
          >
            Deshacer
          </Button>
        </div>
      ) : (
        <Button size="lg" disabled={busy} onClick={() => mark.mutate({ routineId, dia })}>
          {mark.isPending ? 'Guardando…' : `Marcar día ${dia} como hecho hoy`}
        </Button>
      )}
      {!doneToday && (
        <span className="text-xs text-muted-foreground">
          {last ? `Última vez: ${formatDate(last)}` : 'Todavía no lo hiciste.'}
        </span>
      )}
      {(mark.isError || unmark.isError) && (
        <p role="alert" className="text-sm text-destructive">
          No se pudo guardar. Probá de nuevo.
        </p>
      )}
    </div>
  )
}
