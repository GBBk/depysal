import { useState } from 'react'
import { Link } from 'react-router'
import { Input } from '@/components/ui/input'
import { QuickAttendance } from '@/features/attendances/QuickAttendance'
import { useClients, useClientStatuses } from '@/features/clients/api'
import { filterClients } from '@/features/clients/search'
import { StatusBadge } from '@/features/clients/StatusBadge'

const MAX_RESULTS = 10

/** Panel principal. Por ahora: buscador con asistencia rápida (T09). El resto llega en T10. */
export function DashboardPage() {
  const clients = useClients()
  const statuses = useClientStatuses()
  const [query, setQuery] = useState('')

  const statusById = new Map(statuses.data?.map((s) => [s.client_id, s]))
  const results =
    query.trim() && clients.data
      ? filterClients(clients.data, query, false).slice(0, MAX_RESULTS)
      : []

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold">Panel</h1>
      <Input
        type="search"
        placeholder="Buscar cliente por nombre o DNI para registrar asistencia"
        aria-label="Buscar cliente"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      {(clients.isError || statuses.isError) && (
        <p className="text-sm text-destructive">No se pudieron cargar los clientes.</p>
      )}
      {query.trim() && clients.data && results.length === 0 && (
        <p className="text-sm text-muted-foreground">Sin resultados.</p>
      )}
      <ul className="divide-y">
        {results.map((c) => {
          const status = statusById.get(c.id)
          return (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="flex items-center gap-2">
                <Link to={`/admin/clientes/${c.id}`} className="font-medium hover:underline">
                  {c.apellido}, {c.nombre}
                </Link>
                <StatusBadge estado={status?.estado} />
              </div>
              {status && <QuickAttendance clientId={c.id} status={status} />}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
