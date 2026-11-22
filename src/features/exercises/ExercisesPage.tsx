import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '@/app/PageHeader'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { cn } from '@/lib/utils'
import { useExercises, usePhotoUrls } from './api'
import { ExercisePhoto } from './ExercisePhoto'
import { EQUIPOS, GRUPOS } from './options'
import { filterExercises } from './search'

export function ExercisesPage() {
  const exercises = useExercises()
  const [query, setQuery] = useState('')
  const [grupo, setGrupo] = useState('')
  const [equipo, setEquipo] = useState('')

  const all = exercises.data ?? []
  const visible = filterExercises(all, { query, grupo, equipo })
  // Una sola llamada con la primera foto de cada ejercicio de la lista.
  const photos = usePhotoUrls(all.flatMap((e) => e.imagenes.slice(0, 1)))

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Ejercicios"
        description={
          exercises.data
            ? visible.length === all.length
              ? `${all.length} ejercicios`
              : `${visible.length} de ${all.length} ejercicios`
            : undefined
        }
        actions={
          <Link to="/admin/ejercicios/nuevo" className={cn(buttonVariants(), 'gap-1.5')}>
            <Plus />
            Nuevo ejercicio
          </Link>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Buscar ejercicio"
            aria-label="Buscar ejercicio"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
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
        <NativeSelect
          className="w-full shrink-0 sm:w-44"
          aria-label="Filtrar por equipo"
          value={equipo}
          onChange={(e) => setEquipo(e.target.value)}
        >
          <NativeSelectOption value="">Todo el equipo</NativeSelectOption>
          {EQUIPOS.map((q) => (
            <NativeSelectOption key={q} value={q}>
              {q}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      {exercises.isPending && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {exercises.isError && (
        <p className="text-sm text-destructive">No se pudieron cargar los ejercicios.</p>
      )}
      {exercises.data && visible.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {all.length === 0 ? 'Todavía no hay ejercicios.' : 'Sin resultados.'}
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((e) => (
          <li key={e.id}>
            <Link
              to={`/admin/ejercicios/${e.id}`}
              className="flex h-full flex-col gap-2 rounded-xl bg-card p-2 ring-1 ring-foreground/10 transition-shadow hover:ring-primary"
            >
              <ExercisePhoto url={photos.data?.get(e.imagenes[0] ?? '')} alt={e.nombre} />
              <div className="flex flex-1 flex-col gap-1 px-1 pb-1">
                <span className="text-sm leading-snug font-medium">{e.nombre}</span>
                <span className="text-xs text-muted-foreground">
                  {e.grupo_muscular} · {e.equipo}
                </span>
                {e.origen === 'propio' && (
                  <Badge variant="secondary" className="mt-auto w-fit">
                    Propio
                  </Badge>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
