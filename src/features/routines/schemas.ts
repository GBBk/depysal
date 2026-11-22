import { z } from 'zod'

export const DIAS = ['A', 'B', 'C', 'D', 'E', 'F'] as const
export type Dia = (typeof DIAS)[number]

export function isDia(value: string): value is Dia {
  return (DIAS as readonly string[]).includes(value)
}

// El formulario trabaja con strings; toSaveItems los convierte a lo que espera save_routine.
export const routineItemSchema = z.object({
  dia: z.enum(DIAS),
  exercise_id: z.number().int().positive(),
  series: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Series: un número')
    .refine((v) => Number(v) > 0, 'Series: mayor a 0'),
  reps: z.string().trim().min(1, 'Indicá las repeticiones'),
  descanso_seg: z.string().trim().regex(/^\d*$/, 'Descanso: segundos'),
  notas: z.string(),
})

export const routineFormSchema = z.object({
  nombre: z.string().trim().min(1, 'Ingresá el nombre'),
  items: z.array(routineItemSchema),
})

export type RoutineItemValues = z.infer<typeof routineItemSchema>
export type RoutineFormValues = z.infer<typeof routineFormSchema>

/** Ítems para save_routine: `orden` correlativo dentro de cada día, en el orden de la lista. */
export function toSaveItems(items: RoutineItemValues[]) {
  const next: Partial<Record<Dia, number>> = {}
  return items.map((item) => {
    const orden = next[item.dia] ?? 0
    next[item.dia] = orden + 1
    return {
      dia: item.dia,
      orden,
      exercise_id: item.exercise_id,
      series: Number(item.series),
      reps: item.reps.trim(),
      descanso_seg: item.descanso_seg.trim() === '' ? null : Number(item.descanso_seg),
      notas: item.notas.trim(),
    }
  })
}

/** Ítems de la base → valores del formulario, ordenados por día y orden. */
export function toFormItems(
  items: {
    dia: string
    orden: number
    exercise_id: number
    series: number
    reps: string
    descanso_seg: number | null
    notas: string | null
  }[],
): RoutineItemValues[] {
  return [...items]
    .sort((a, b) => a.dia.localeCompare(b.dia) || a.orden - b.orden)
    .filter((i) => isDia(i.dia))
    .map((i) => ({
      dia: i.dia as Dia,
      exercise_id: i.exercise_id,
      series: String(i.series),
      reps: i.reps,
      descanso_seg: i.descanso_seg === null ? '' : String(i.descanso_seg),
      notas: i.notas ?? '',
    }))
}

/** Días que tiene la rutina (con ítems o recién agregados), en orden. */
export function routineDays(items: { dia: string }[], extra: string[] = []): Dia[] {
  const set = new Set([...items.map((i) => i.dia), ...extra])
  return DIAS.filter((d) => set.has(d))
}

/** Siguiente letra libre para agregar un día, o null si ya están las 6. */
export function nextDay(days: string[]): Dia | null {
  return DIAS.find((d) => !days.includes(d)) ?? null
}

/** Última fecha en que el cliente marcó cada día como hecho. */
export function lastDoneByDay(completions: { dia: string; fecha: string }[]) {
  const last: Partial<Record<string, string>> = {}
  for (const c of completions) {
    const prev = last[c.dia]
    if (!prev || c.fecha > prev) last[c.dia] = c.fecha
  }
  return last
}
