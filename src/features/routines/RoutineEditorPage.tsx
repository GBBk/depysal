import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, ChevronLeft, ChevronUp, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useExercises, usePhotoUrls, type Exercise } from '@/features/exercises/api'
import { ExercisePhoto } from '@/features/exercises/ExercisePhoto'
import { cn } from '@/lib/utils'
import { useDeleteRoutine, useRoutine, useSaveRoutine, type Routine } from './api'
import { ExercisePicker } from './ExercisePicker'
import {
  nextDay,
  routineDays,
  routineFormSchema,
  toFormItems,
  type Dia,
  type RoutineFormValues,
} from './schemas'

/** /admin/rutinas/:id — sirve para plantillas y para rutinas de clientes. */
export function RoutineEditorPage() {
  const { id } = useParams()
  const routine = useRoutine(Number(id))
  const exercises = useExercises()

  if (routine.isPending || exercises.isPending) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>
  }
  if (routine.isError) return <p className="text-sm text-destructive">No se encontró la rutina.</p>
  if (exercises.isError) {
    return <p className="text-sm text-destructive">No se pudieron cargar los ejercicios.</p>
  }
  return <RoutineEditor routine={routine.data} exercises={exercises.data} />
}

function RoutineEditor({ routine, exercises }: { routine: Routine; exercises: Exercise[] }) {
  const navigate = useNavigate()
  const save = useSaveRoutine(routine.id)
  const remove = useDeleteRoutine()
  // Misma consulta que el listado de ejercicios: comparte la caché de URLs firmadas.
  const photos = usePhotoUrls(exercises.flatMap((e) => e.imagenes.slice(0, 1)))
  const byId = new Map(exercises.map((e) => [e.id, e]))

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<RoutineFormValues>({
    resolver: zodResolver(routineFormSchema),
    defaultValues: { nombre: routine.nombre, items: toFormItems(routine.routine_items) },
  })
  const { fields, append, remove: removeItems, swap } = useFieldArray({ control, name: 'items' })

  // Días sin ejercicios todavía (solo existen en pantalla hasta que se les agrega algo).
  const [extraDays, setExtraDays] = useState<Dia[]>(() =>
    routine.routine_items.length === 0 ? ['A'] : [],
  )
  const days = routineDays(fields, extraDays)
  const [selectedDay, setSelectedDay] = useState<Dia | undefined>(days[0])
  const day = selectedDay && days.includes(selectedDay) ? selectedDay : days[0]
  const [picking, setPicking] = useState(fields.length === 0)

  const dayItems = fields
    .map((field, index) => ({ field, index }))
    .filter((x) => x.field.dia === day)
  const backTo = routine.es_plantilla ? '/admin/rutinas' : `/admin/clientes/${routine.client_id}`
  const owner = routine.profiles ? `${routine.profiles.nombre} ${routine.profiles.apellido}` : ''

  const addDay = () => {
    const d = nextDay(days)
    if (!d) return
    setExtraDays((prev) => [...prev, d])
    setSelectedDay(d)
    setPicking(true)
  }

  const removeDay = () => {
    if (!day) return
    if (
      dayItems.length > 0 &&
      !window.confirm(`¿Quitar el día ${day} y sus ${dayItems.length} ejercicios?`)
    ) {
      return
    }
    removeItems(dayItems.map((x) => x.index))
    setExtraDays((prev) => prev.filter((d) => d !== day))
    setSelectedDay(days.find((d) => d !== day))
  }

  const onSubmit = (values: RoutineFormValues) =>
    save.mutate(values, { onSuccess: () => reset(values) })

  const onDelete = () => {
    const what = routine.es_plantilla ? 'la plantilla' : 'la rutina'
    if (!window.confirm(`¿Eliminar ${what} "${routine.nombre}"? No se puede deshacer.`)) return
    remove.mutate(routine.id, { onSuccess: () => navigate(backTo) })
  }

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <Link
        to={backTo}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {routine.es_plantilla ? 'Rutinas' : owner}
      </Link>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {routine.es_plantilla ? (
              <Badge variant="secondary">Plantilla</Badge>
            ) : (
              <>
                <Badge variant="secondary">Rutina de {owner}</Badge>
                <Badge variant={routine.activa ? 'default' : 'outline'}>
                  {routine.activa ? 'Activa' : 'Inactiva'}
                </Badge>
              </>
            )}
          </div>
          <Label htmlFor="nombre" className="sr-only">
            Nombre de la rutina
          </Label>
          <Input
            id="nombre"
            className="h-12 font-heading text-xl font-bold md:text-xl"
            aria-invalid={errors.nombre ? true : undefined}
            {...register('nombre')}
          />
          {errors.nombre && <p className="text-sm text-destructive">{errors.nombre.message}</p>}
        </div>

        {/* Días */}
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Días">
          {days.map((d) => {
            const count = fields.filter((f) => f.dia === d).length
            return (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={d === day}
                onClick={() => {
                  setSelectedDay(d)
                  setPicking(false)
                }}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                  d === day
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card ring-1 ring-foreground/10 hover:ring-primary',
                )}
              >
                Día {d}
                <span className="ml-1.5 font-normal opacity-70">{count}</span>
              </button>
            )
          })}
          {nextDay(days) && (
            <Button type="button" variant="ghost" className="gap-1.5" onClick={addDay}>
              <Plus />
              Agregar día
            </Button>
          )}
        </div>

        {day && (
          <section className="flex flex-col gap-3" role="tabpanel" aria-label={`Día ${day}`}>
            {dayItems.length === 0 && !picking && (
              <p className="text-sm text-muted-foreground">Este día no tiene ejercicios todavía.</p>
            )}
            <ol className="flex flex-col gap-3">
              {dayItems.map(({ field, index }, position) => {
                const exercise = byId.get(field.exercise_id)
                const itemErrors = errors.items?.[index]
                return (
                  <li
                    key={field.id}
                    className="flex flex-col gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-center text-sm font-semibold text-muted-foreground">
                        {position + 1}
                      </span>
                      <ExercisePhoto
                        url={photos.data?.get(exercise?.imagenes[0] ?? '')}
                        alt=""
                        className="w-16 shrink-0 rounded-md"
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-medium">
                          {exercise?.nombre ?? 'Ejercicio borrado'}
                        </span>
                        {exercise && (
                          <span className="text-xs text-muted-foreground">
                            {exercise.grupo_muscular} · {exercise.equipo}
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Subir"
                          disabled={position === 0}
                          onClick={() => swap(index, dayItems[position - 1].index)}
                        >
                          <ChevronUp />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Bajar"
                          disabled={position === dayItems.length - 1}
                          onClick={() => swap(index, dayItems[position + 1].index)}
                        >
                          <ChevronDown />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Quitar ejercicio"
                          onClick={() => removeItems(index)}
                        >
                          <X />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-[5rem_8rem_7rem_1fr]">
                      <ItemField label="Series" error={itemErrors?.series?.message}>
                        <Input inputMode="numeric" {...register(`items.${index}.series`)} />
                      </ItemField>
                      <ItemField label="Repeticiones" error={itemErrors?.reps?.message}>
                        <Input placeholder="10-12" {...register(`items.${index}.reps`)} />
                      </ItemField>
                      <ItemField label="Descanso (s)" error={itemErrors?.descanso_seg?.message}>
                        <Input inputMode="numeric" {...register(`items.${index}.descanso_seg`)} />
                      </ItemField>
                      <ItemField label="Notas" className="col-span-3 sm:col-span-1">
                        <Input placeholder="Opcional" {...register(`items.${index}.notas`)} />
                      </ItemField>
                    </div>
                  </li>
                )
              })}
            </ol>

            {picking ? (
              <ExercisePicker
                exercises={exercises}
                photoUrls={photos.data}
                onClose={() => setPicking(false)}
                onPick={(e) =>
                  append({
                    dia: day,
                    exercise_id: e.id,
                    series: '3',
                    reps: '10-12',
                    descanso_seg: '60',
                    notas: '',
                  })
                }
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setPicking(true)}
                >
                  <Plus />
                  Agregar ejercicio al día {day}
                </Button>
                <Button type="button" variant="ghost" onClick={removeDay}>
                  Quitar día {day}
                </Button>
              </div>
            )}
          </section>
        )}

        <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-3 rounded-xl bg-card p-3 shadow-lg ring-1 ring-foreground/10 md:bottom-4">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
          <span className="text-sm text-muted-foreground" role="status">
            {save.isError
              ? ''
              : isDirty
                ? 'Hay cambios sin guardar.'
                : save.isSuccess
                  ? 'Guardado.'
                  : ''}
          </span>
          {save.isError && (
            <span role="alert" className="text-sm text-destructive">
              No se pudo guardar. Revisá los datos y probá de nuevo.
            </span>
          )}
          {errors.items && (
            <span role="alert" className="text-sm text-destructive">
              Hay ejercicios con datos incompletos.
            </span>
          )}
        </div>
      </form>

      <div className="flex flex-col items-start gap-2 border-t pt-4">
        <Button variant="destructive" disabled={remove.isPending} onClick={onDelete}>
          {routine.es_plantilla ? 'Eliminar plantilla' : 'Eliminar rutina'}
        </Button>
        {remove.isError && (
          <p role="alert" className="text-sm text-destructive">
            No se pudo eliminar. Probá de nuevo.
          </p>
        )}
      </div>
    </div>
  )
}

function ItemField({
  label,
  error,
  className,
  children,
}: {
  label: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={cn('flex flex-col gap-1 text-xs text-muted-foreground', className)}>
      {label}
      {children}
      {error && <span className="text-destructive">{error}</span>}
    </label>
  )
}
