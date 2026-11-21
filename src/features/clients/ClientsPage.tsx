import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '@/app/PageHeader'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useClients, useClientStatuses } from './api'
import { ClientAvatar } from './ClientAvatar'
import { estadoLabels, estados, isEstado, type Estado } from './estado'
import { filterClients } from './search'
import { StatusBadge } from './StatusBadge'

export function ClientsPage() {
  const clients = useClients()
  const statuses = useClientStatuses()
  const [query, setQuery] = useState('')
  const [estado, setEstado] = useState<Estado | ''>('')
  const [showInactive, setShowInactive] = useState(false)

  const estadoById = new Map(statuses.data?.map((s) => [s.client_id, s.estado]))
  const visible = clients.data
    ? filterClients(clients.data, query, showInactive).filter(
        (c) => estado === '' || estadoById.get(c.id) === estado,
      )
    : []
  const isFiltering = query.trim() !== '' || estado !== ''

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Clientes"
        description={
          clients.data ? `${clients.data.filter((c) => c.activo).length} activos` : undefined
        }
        actions={
          <Link to="/admin/clientes/nuevo" className={cn(buttonVariants(), 'gap-1.5')}>
            <Plus />
            Nuevo cliente
          </Link>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Input
          type="search"
          placeholder="Buscar por nombre o DNI"
          aria-label="Buscar por nombre o DNI"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <NativeSelect
          className="w-full shrink-0 sm:w-48"
          aria-label="Filtrar por estado de cuota"
          value={estado}
          onChange={(e) => setEstado(isEstado(e.target.value) ? e.target.value : '')}
        >
          <NativeSelectOption value="">Todos los estados</NativeSelectOption>
          {estados.map((e) => (
            <NativeSelectOption key={e} value={e}>
              {estadoLabels[e]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Mostrar inactivos
        </label>
      </div>

      {clients.isPending && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {(clients.isError || statuses.isError) && (
        <p className="text-sm text-destructive">No se pudieron cargar los clientes.</p>
      )}

      {clients.data && (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden sm:table-cell">DNI</TableHead>
                <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      to={`/admin/clientes/${c.id}`}
                      className="inline-flex items-center gap-3 font-medium hover:underline"
                    >
                      <ClientAvatar nombre={c.nombre} apellido={c.apellido} />
                      {c.apellido}, {c.nombre}
                    </Link>
                    {!c.activo && (
                      <Badge variant="secondary" className="ml-2">
                        Inactivo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge estado={estadoById.get(c.id)} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{c.dni}</TableCell>
                  <TableCell className="hidden sm:table-cell">{c.telefono}</TableCell>
                </TableRow>
              ))}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {clients.data.length === 0
                      ? 'Todavía no hay clientes.'
                      : isFiltering
                        ? 'Sin resultados.'
                        : 'No hay clientes activos.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
