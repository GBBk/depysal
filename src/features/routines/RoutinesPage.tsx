import { ClipboardList, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { PageHeader } from '@/app/PageHeader'
import { Button } from '@/components/ui/button'
import { useCreateTemplate, useTemplates } from './api'
import { routineDays } from './schemas'

/** Plantillas de rutina. Las rutinas de cada cliente se ven y asignan desde su ficha. */
export function RoutinesPage() {
  const templates = useTemplates()
  const create = useCreateTemplate()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Rutinas"
        description="Plantillas para asignar a los clientes desde su ficha. Al asignarla se crea una copia: editarla no cambia la plantilla."
        actions={
          <Button
            className="gap-1.5"
            disabled={create.isPending}
            onClick={() =>
              create.mutate(undefined, { onSuccess: (id) => navigate(`/admin/rutinas/${id}`) })
            }
          >
            <Plus />
            Nueva plantilla
          </Button>
        }
      />
      {create.isError && (
        <p role="alert" className="text-sm text-destructive">
          No se pudo crear la plantilla. Probá de nuevo.
        </p>
      )}

      {templates.isPending && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {templates.isError && (
        <p className="text-sm text-destructive">No se pudieron cargar las plantillas.</p>
      )}
      {templates.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">Todavía no hay plantillas.</p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.data?.map((t) => {
          const days = routineDays(t.routine_items)
          return (
            <li key={t.id}>
              <Link
                to={`/admin/rutinas/${t.id}`}
                className="flex h-full items-start gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-shadow hover:ring-primary"
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"
                  aria-hidden
                >
                  <ClipboardList className="size-5" />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="font-medium">{t.nombre}</span>
                  <span className="text-sm text-muted-foreground">
                    {days.length === 0
                      ? 'Sin ejercicios todavía'
                      : `${days.length} ${days.length === 1 ? 'día' : 'días'} (${days.join(', ')}) · ${t.routine_items.length} ${t.routine_items.length === 1 ? 'ejercicio' : 'ejercicios'}`}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
