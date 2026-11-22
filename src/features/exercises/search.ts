import { normalizeText, searchWords } from '@/lib/text'

type Searchable = { nombre: string; grupo_muscular: string; equipo: string }

export type ExerciseFilters = { query: string; grupo: string; equipo: string }

/** Filtra por nombre (sin tildes), grupo y equipo. Grupo o equipo vacío = todos. */
export function filterExercises<T extends Searchable>(
  exercises: T[],
  filters: ExerciseFilters,
): T[] {
  const words = searchWords(filters.query)
  return exercises.filter((e) => {
    if (filters.grupo && e.grupo_muscular !== filters.grupo) return false
    if (filters.equipo && e.equipo !== filters.equipo) return false
    const name = normalizeText(e.nombre)
    return words.every((w) => name.includes(w))
  })
}
