import { describe, expect, it } from 'vitest'
import { filterClients } from './search'

const clients = [
  { nombre: 'Ana', apellido: 'Pérez', dni: '30111222', activo: true },
  { nombre: 'José', apellido: 'Gómez', dni: '28999000', activo: true },
  { nombre: 'Lucía', apellido: 'Pérez', dni: '40123456', activo: false },
]

const names = (list: typeof clients) => list.map((c) => c.nombre)

describe('filterClients', () => {
  it('sin búsqueda muestra solo activos', () => {
    expect(names(filterClients(clients, '', false))).toEqual(['Ana', 'José'])
  })

  it('con "mostrar inactivos" incluye las bajas', () => {
    expect(names(filterClients(clients, '', true))).toEqual(['Ana', 'José', 'Lucía'])
  })

  it('busca por nombre o apellido sin importar tildes ni mayúsculas', () => {
    expect(names(filterClients(clients, 'perez', true))).toEqual(['Ana', 'Lucía'])
    expect(names(filterClients(clients, 'JOSE', false))).toEqual(['José'])
  })

  it('busca por nombre y apellido juntos', () => {
    expect(names(filterClients(clients, 'ana pérez', true))).toEqual(['Ana'])
  })

  it('busca por DNI, con o sin puntos', () => {
    expect(names(filterClients(clients, '28999', false))).toEqual(['José'])
    expect(names(filterClients(clients, '30.111.222', false))).toEqual(['Ana'])
  })
})
