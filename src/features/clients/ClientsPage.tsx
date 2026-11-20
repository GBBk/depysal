import { useState } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useClients } from './api'
import { filterClients } from './search'

export function ClientsPage() {
  const clients = useClients()
  const [query, setQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const visible = clients.data ? filterClients(clients.data, query, showInactive) : []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <Link to="/admin/clientes/nuevo" className={buttonVariants()}>
          Nuevo cliente
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Input
          type="search"
          placeholder="Buscar por nombre o DNI"
          aria-label="Buscar por nombre o DNI"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Mostrar inactivos
        </label>
      </div>

      {clients.isPending && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {clients.isError && (
        <p className="text-sm text-destructive">No se pudieron cargar los clientes.</p>
      )}

      {clients.data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>DNI</TableHead>
              <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link to={`/admin/clientes/${c.id}`} className="font-medium hover:underline">
                    {c.apellido}, {c.nombre}
                  </Link>
                  {!c.activo && (
                    <Badge variant="secondary" className="ml-2">
                      Inactivo
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{c.dni}</TableCell>
                <TableCell className="hidden sm:table-cell">{c.telefono}</TableCell>
              </TableRow>
            ))}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  {clients.data.length === 0
                    ? 'Todavía no hay clientes.'
                    : query.trim()
                      ? 'Sin resultados.'
                      : 'No hay clientes activos.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
