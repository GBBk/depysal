import { z } from 'zod'
import { EQUIPOS, GRUPOS, PHOTO_MAX_BYTES, PHOTO_TYPES } from './options'

export const exerciseSchema = z.object({
  nombre: z.string().trim().min(1, 'Ingresá el nombre'),
  grupo_muscular: z.enum(GRUPOS, 'Elegí el grupo muscular'),
  equipo: z.enum(EQUIPOS, 'Elegí el equipo'),
  instrucciones: z.string().trim(),
  video_url: z
    .string()
    .trim()
    .refine((v) => v === '' || /^https?:\/\/\S+$/.test(v), 'Pegá un link completo (https://…)'),
})

export type ExerciseValues = z.infer<typeof exerciseSchema>

export function toExerciseRow(values: ExerciseValues) {
  return {
    nombre: values.nombre,
    grupo_muscular: values.grupo_muscular,
    equipo: values.equipo,
    instrucciones: values.instrucciones,
    video_url: values.video_url === '' ? null : values.video_url,
  }
}

/** Valida una foto antes de subirla. Devuelve el mensaje de error o null. */
export function photoError(file: { type: string; size: number }): string | null {
  if (!PHOTO_TYPES.includes(file.type)) return 'La foto tiene que ser JPG, PNG o WEBP.'
  if (file.size > PHOTO_MAX_BYTES) return 'La foto no puede pesar más de 2 MB.'
  return null
}

/** Ruta en el bucket para una foto propia. El timestamp evita que el navegador muestre la vieja. */
export function photoPath(exerciseId: number, slot: number, fileName: string, now = Date.now()) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg'
  return `propios/${exerciseId}/${slot}-${now}.${ext}`
}
