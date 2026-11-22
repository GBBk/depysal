import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { photoPath, toExerciseRow, type ExerciseValues } from './schemas'

const BUCKET = 'exercise-images'
const columns = 'id, nombre, grupo_muscular, equipo, instrucciones, imagenes, video_url, origen'

export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exercises').select(columns).order('nombre')
      if (error) throw error
      return data
    },
  })
}

export type Exercise = NonNullable<ReturnType<typeof useExercises>['data']>[number]

export function useExercise(id: number | undefined) {
  return useQuery({
    queryKey: ['exercises', id],
    enabled: id !== undefined,
    queryFn: async () => {
      if (id === undefined) throw new Error('Falta el id')
      const { data, error } = await supabase.from('exercises').select(columns).eq('id', id).single()
      if (error) throw error
      return data
    },
  })
}

/**
 * URLs firmadas para mostrar fotos del bucket privado (válidas 1 hora). Se piden todas juntas.
 * Devuelve un Map ruta → URL.
 */
export function usePhotoUrls(paths: string[]) {
  const unique = [...new Set(paths)].sort()
  return useQuery({
    queryKey: ['exercise-photos', unique],
    enabled: unique.length > 0,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(unique, 60 * 60)
      if (error) throw error
      const urls = new Map<string, string>()
      for (const item of data) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl)
      return urls
    },
  })
}

/** Lo que pasa con cada lugar de foto al guardar: se queda, se reemplaza o se quita. */
export type PhotoSlot =
  { kind: 'keep'; path: string } | { kind: 'new'; file: File } | { kind: 'none' }

/** Solo se borran del bucket las fotos propias: las importadas las maneja el script de T13. */
function ownPhotos(paths: string[]): string[] {
  return paths.filter((p) => p.startsWith('propios/'))
}

export function useSaveExercise() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      values,
      slots,
      previous,
    }: {
      id?: number
      values: ExerciseValues
      slots: PhotoSlot[]
      previous: string[]
    }) => {
      // 1. Datos del ejercicio.
      let exerciseId = id
      if (exerciseId === undefined) {
        const { data, error } = await supabase
          .from('exercises')
          .insert({ ...toExerciseRow(values), origen: 'propio' })
          .select('id')
          .single()
        if (error) throw error
        exerciseId = data.id
      } else {
        const { error } = await supabase
          .from('exercises')
          .update(toExerciseRow(values))
          .eq('id', exerciseId)
        if (error) throw error
      }

      // 2. Fotos nuevas.
      const imagenes: string[] = []
      for (const [i, slot] of slots.entries()) {
        if (slot.kind === 'keep') imagenes.push(slot.path)
        if (slot.kind === 'new') {
          const path = photoPath(exerciseId, i, slot.file.name)
          const { error } = await supabase.storage
            .from(BUCKET)
            .upload(path, slot.file, { contentType: slot.file.type })
          if (error) throw error
          imagenes.push(path)
        }
      }

      // 3. Lista de fotos del ejercicio.
      const { error } = await supabase.from('exercises').update({ imagenes }).eq('id', exerciseId)
      if (error) throw error

      // 4. Borrar las fotos propias que ya no se usan (si falla, solo queda un archivo huérfano).
      const unused = ownPhotos(previous.filter((p) => !imagenes.includes(p)))
      if (unused.length > 0) await supabase.storage.from(BUCKET).remove(unused)

      return exerciseId
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['exercises'] }),
        queryClient.invalidateQueries({ queryKey: ['exercise-photos'] }),
      ]),
  })
}

/** El ejercicio está en alguna rutina: la base no deja borrarlo. */
export class ExerciseInUseError extends Error {}

export function useDeleteExercise() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (exercise: { id: number; imagenes: string[] }) => {
      const { error } = await supabase.from('exercises').delete().eq('id', exercise.id)
      if (error) {
        if (error.code === '23503') {
          throw new ExerciseInUseError('Este ejercicio está en una rutina: no se puede borrar.')
        }
        throw error
      }
      const own = ownPhotos(exercise.imagenes)
      if (own.length > 0) await supabase.storage.from(BUCKET).remove(own)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercises'] }),
  })
}
