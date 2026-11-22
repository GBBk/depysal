import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAssignRoutine, useClientRoutine, useTemplates } from './api'
import { lastDoneByDay, routineDays } from './schemas'

/** Ficha del cliente: rutina activa, última vez que hizo cada día y asignación. */
export function ClientRoutineSection({
  clientId,
  clientName,
}: {
  clientId: string
  clientName: string
}) {
  const routine = useClientRoutine(clientId)
  const [assigning, setAssigning] = useState(false)

  if (routine.isPending) return <p className="text-sm text-muted-foreground">Cargando…</p>
  if (routine.isError) {
    return <p className="text-sm text-destructive">No se pudo cargar la rutina.</p>
  }

  const active = routine.data
  const showForm = assigning || !active

  return (
    <div className="flex flex-col gap-4">
      {active ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{active.nombre}</span>
            <Link
              to={`/admin/rutinas/${active.id}`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
            >
              <Pencil />
              Editar rutina
            </Link>
          </div>
          <DaysSummary items={active.routine_items} completions={active.routine_completions} />
        </div>
      ) : (
        <p className="text-sm">Sin rutina asignada.</p>
      )}

      {showForm ? (
        <AssignForm
          clientId={clientId}
          clientName={clientName}
          current={active?.nombre}
          onCancel={active ? () => setAssigning(false) : undefined}
          onDone={() => setAssigning(false)}
        />
      ) : (
        <div>
          <Button variant="ghost" size="sm" onClick={() => setAssigning(true)}>
            Asignar otra rutina
          </Button>
        </div>
      )}
    </div>
  )
}

function DaysSummary({
  items,
  completions,
}: {
  items: { dia: string }[]
  completions: { dia: string; fecha: string }[]
}) {
  const days = routineDays(items)
  const last = lastDoneByDay(completions)
  if (days.length === 0) {
    return <p className="text-sm text-muted-foreground">La rutina todavía no tiene ejercicios.</p>
  }
  return (
    <ul className="divide-y rounded-lg ring-1 ring-foreground/10">
      {days.map((d) => {
        const count = items.filter((i) => i.dia === d).length
        const fecha = last[d]
        return (
          <li key={d} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
            <span>
              <span className="font-semibold">Día {d}</span>
              <span className="text-muted-foreground">
                {' · '}
                {count} {count === 1 ? 'ejercicio' : 'ejercicios'}
              </span>
            </span>
            <span className={fecha ? '' : 'text-muted-foreground'}>
              {fecha ? `Última vez: ${formatDate(fecha)}` : 'Todavía no lo hizo'}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function AssignForm({
  clientId,
  clientName,
  current,
  onCancel,
  onDone,
}: {
  clientId: string
  clientName: string
  current: string | undefined
  onCancel?: () => void
  onDone: () => void
}) {
  const templates = useTemplates()
  const assign = useAssignRoutine(clientId)
  const navigate = useNavigate()
  const [source, setSource] = useState('')
  const [nombre, setNombre] = useState('')

  const template = templates.data?.find((t) => String(t.id) === source)
  const placeholder = template ? template.nombre : `Rutina de ${clientName}`

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!source) return
    if (
      current &&
      !window.confirm(`"${current}" va a quedar inactiva. ¿Asignar la nueva rutina?`)
    ) {
      return
    }
    const desdeCero = source === 'cero'
    assign.mutate(
      { templateId: desdeCero ? null : Number(source), nombre: nombre || placeholder },
      {
        onSuccess: (id) => {
          if (desdeCero) navigate(`/admin/rutinas/${id}`)
          else onDone()
        },
      },
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-dashed p-3"
      aria-label="Asignar rutina"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Rutina
          <NativeSelect
            className="w-full"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <NativeSelectOption value="">Elegí una plantilla</NativeSelectOption>
            {templates.data?.map((t) => (
              <NativeSelectOption key={t.id} value={String(t.id)}>
                {t.nombre}
              </NativeSelectOption>
            ))}
            <NativeSelectOption value="cero">Desde cero (vacía)</NativeSelectOption>
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Nombre (opcional)
          <Input
            value={nombre}
            placeholder={placeholder}
            onChange={(e) => setNombre(e.target.value)}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Desde una plantilla se crea una copia para este cliente: editarla no cambia la plantilla.
      </p>
      {assign.isError && (
        <p role="alert" className="text-sm text-destructive">
          No se pudo asignar la rutina. Probá de nuevo.
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!source || assign.isPending}>
          {assign.isPending ? 'Asignando…' : 'Asignar'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
