import { describe, expect, it } from 'vitest'
import { canEnter, homePath } from './access'

const admin = { rol: 'admin', activo: true }
const client = { rol: 'client', activo: true }
const inactiveClient = { rol: 'client', activo: false }

describe('navegación por rol', () => {
  it('cada rol termina en su sección', () => {
    expect(homePath(admin)).toBe('/admin')
    expect(homePath(client)).toBe('/app')
    expect(homePath(inactiveClient)).toBe('/app')
  })

  it('el admin entra a /admin y no a /app', () => {
    expect(canEnter('admin', admin)).toBe('ok')
    expect(canEnter('app', admin)).toBe('forbidden')
  })

  it('el cliente entra a /app y no a /admin', () => {
    expect(canEnter('app', client)).toBe('ok')
    expect(canEnter('admin', client)).toBe('forbidden')
  })

  it('un cliente inactivo queda bloqueado', () => {
    expect(canEnter('app', inactiveClient)).toBe('inactive')
    expect(canEnter('admin', inactiveClient)).toBe('forbidden')
  })
})
