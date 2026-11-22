import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/features/clients/FormField'
import {
  ExerciseInUseError,
  useDeleteExercise,
  useExercise,
  usePhotoUrls,
  useSaveExercise,
  type Exercise,
  type PhotoSlot,
} from './api'
import { EQUIPOS, GRUPOS, PHOTO_LABELS } from './options'
import { PhotoField } from './PhotoField'
import { exerciseSchema, type ExerciseValues } from './schemas'

/** /admin/ejercicios/nuevo y /admin/ejercicios/:id */
export function ExerciseFormPage() {
  const { id } = useParams()
  const exerciseId = id === undefined ? undefined : Number(id)
  const exercise = useExercise(exerciseId)

  if (exerciseId === undefined) return <ExerciseForm />
  if (exercise.isPending) return <p className="text-sm text-muted-foreground">Cargando…</p>
  if (exercise.isError) {
    return <p className="text-sm text-destructive">No se encontró el ejercicio.</p>
  }
  return <ExerciseForm exercise={exercise.data} />
}

function ExerciseForm({ exercise }: { exercise?: Exercise }) {
  const navigate = useNavigate()
  const save = useSaveExercise()
  const remove = useDeleteExercise()
  const saved = exercise?.imagenes ?? []
  const savedUrls = usePhotoUrls(saved)

  const [slots, setSlots] = useState<PhotoSlot[]>(() =>
    PHOTO_LABELS.map((_, i) => (saved[i] ? { kind: 'keep', path: saved[i] } : { kind: 'none' })),
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExerciseValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: exercise
      ? {
          nombre: exercise.nombre,
          // Los valores de la base ya respetan la lista fija (CHECK); el formulario los valida igual.
          grupo_muscular: exercise.grupo_muscular as ExerciseValues['grupo_muscular'],
          equipo: exercise.equipo as ExerciseValues['equipo'],
          instrucciones: exercise.instrucciones,
          video_url: exercise.video_url ?? '',
        }
      : { nombre: '', instrucciones: '', video_url: '' },
  })

  const onSubmit = (values: ExerciseValues) =>
    save.mutate(
      { id: exercise?.id, values, slots, previous: saved },
      { onSuccess: () => navigate('/admin/ejercicios') },
    )

  const onDelete = () => {
    if (!exercise) return
    if (!window.confirm(`¿Eliminar "${exercise.nombre}"? No se puede deshacer.`)) return
    remove.mutate(exercise, { onSuccess: () => navigate('/admin/ejercicios') })
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Link
        to="/admin/ejercicios"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Ejercicios
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          {exercise ? exercise.nombre : 'Nuevo ejercicio'}
        </h1>
        {exercise?.origen === 'importado' && <Badge variant="secondary">De la biblioteca</Badge>}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <Card>
          <CardContent className="flex flex-col gap-4">
            <FormField id="nombre" label="Nombre" error={errors.nombre?.message}>
              <Input id="nombre" {...register('nombre')} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="grupo_muscular"
                label="Grupo muscular"
                error={errors.grupo_muscular?.message}
              >
                <NativeSelect
                  id="grupo_muscular"
                  className="w-full"
                  {...register('grupo_muscular')}
                >
                  <NativeSelectOption value="">Elegí un grupo</NativeSelectOption>
                  {GRUPOS.map((g) => (
                    <NativeSelectOption key={g} value={g}>
                      {g}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField id="equipo" label="Equipo" error={errors.equipo?.message}>
                <NativeSelect id="equipo" className="w-full" {...register('equipo')}>
                  <NativeSelectOption value="">Elegí el equipo</NativeSelectOption>
                  {EQUIPOS.map((q) => (
                    <NativeSelectOption key={q} value={q}>
                      {q}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
            </div>
            <FormField id="instrucciones" label="Instrucciones">
              <Textarea id="instrucciones" rows={4} {...register('instrucciones')} />
            </FormField>
            <FormField
              id="video_url"
              label="Link a video (opcional)"
              error={errors.video_url?.message}
            >
              <Input
                id="video_url"
                type="url"
                placeholder="https://www.youtube.com/…"
                {...register('video_url')}
              />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fotos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {PHOTO_LABELS.map((label, i) => (
              <PhotoField
                key={label}
                label={label}
                slot={slots[i]}
                savedUrl={savedUrls.data?.get(saved[i] ?? '')}
                onChange={(slot) => setSlots((prev) => prev.map((s, j) => (j === i ? slot : s)))}
              />
            ))}
            <p className="text-xs text-muted-foreground sm:col-span-2">
              JPG, PNG o WEBP de hasta 2 MB. Los cambios se guardan al tocar "Guardar".
            </p>
          </CardContent>
        </Card>

        {save.isError && (
          <p role="alert" className="text-sm text-destructive">
            No se pudo guardar el ejercicio. Probá de nuevo.
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Guardando…' : exercise ? 'Guardar' : 'Crear ejercicio'}
          </Button>
          <Link to="/admin/ejercicios" className={buttonVariants({ variant: 'outline' })}>
            Cancelar
          </Link>
        </div>
      </form>

      {exercise && (
        <div className="flex flex-col items-start gap-2 border-t pt-4">
          <Button variant="destructive" disabled={remove.isPending} onClick={onDelete}>
            Eliminar ejercicio
          </Button>
          {remove.isError && (
            <p role="alert" className="text-sm text-destructive">
              {remove.error instanceof ExerciseInUseError
                ? remove.error.message
                : 'No se pudo eliminar el ejercicio. Probá de nuevo.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
