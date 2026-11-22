import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { Exercise } from '@/features/exercises/api'
import { ExercisePhoto } from '@/features/exercises/ExercisePhoto'
import { GRUPOS } from '@/features/exercises/options'
import { filterExercises } from '@/features/exercises/search'

/** Buscador de ejercicios para sumar a un día. Queda abierto para agregar varios seguidos. */
export function ExercisePicker({
  exercises,
  photoUrls,
  onPick,
  onClose,
}: {
  exercises: Exercise[]
  photoUrls: Map<string, string> | undefined
  onPick: (exercise: Exercise) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [grupo, setGrupo] = useState('')
  const visible = filterExercises(exercises, { query, grupo, equipo: '' })

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-primary/60 bg-accent/40 p-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Buscar ejercicio para agregar"
            aria-label="Buscar ejercicio para agregar"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
        <NativeSelect
          className="w-full shrink-0 sm:w-44"
          aria-label="Filtrar por grupo muscular"
          value={grupo}
          onChange={(e) => setGrupo(e.target.value)}
        >
          <NativeSelectOption value="">Todos los grupos</NativeSelectOption>
          {GRUPOS.map((g) => (
            <NativeSelectOption key={g} value={g}>
              {g}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button type="button" variant="outline" onClick={onClose}>
          Listo
        </Button>
      </div>
      <ul className="max-h-80 divide-y overflow-y-auto rounded-lg bg-card">
        {visible.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onPick(e)}
              className="flex w-full items-center gap-3 px-2 py-2 text-left hover:bg-muted"
            >
              <ExercisePhoto
                url={photoUrls?.get(e.imagenes[0] ?? '')}
                alt=""
                className="w-16 shrink-0 rounded-md"
              />
              <span className="flex flex-1 flex-col">
                <span className="text-sm font-medium">{e.nombre}</span>
                <span className="text-xs text-muted-foreground">
                  {e.grupo_muscular} · {e.equipo}
                </span>
              </span>
              <Plus className="size-4 text-primary" aria-hidden />
            </button>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="px-2 py-3 text-sm text-muted-foreground">Sin resultados.</li>
        )}
      </ul>
    </div>
  )
}
