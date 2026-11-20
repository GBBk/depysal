import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, createUser, deleteUsers, randomDni, service, type TestUser } from './helpers'

describe('profiles: trigger, is_admin() y RLS', () => {
  const dniA = randomDni()
  let admin: TestUser
  let clientA: TestUser
  let clientB: TestUser

  beforeAll(async () => {
    admin = await createUser('admin')
    clientA = await createUser('client', { nombre: 'Ana', apellido: 'Pérez', dni: dniA })
    clientB = await createUser('client', { nombre: 'Beto', apellido: 'Gómez', dni: randomDni() })
  })

  afterAll(async () => {
    await deleteUsers(admin, clientA, clientB)
  })

  it('el trigger crea el profile con los datos del usuario', async () => {
    const { data, error } = await service
      .from('profiles')
      .select('rol, nombre, apellido, dni, email, activo')
      .eq('id', clientA.id)
      .single()
    expect(error).toBeNull()
    expect(data).toEqual({
      rol: 'client',
      nombre: 'Ana',
      apellido: 'Pérez',
      dni: dniA,
      email: clientA.email,
      activo: true,
    })
  })

  it('el trigger siempre crea clientes: el rol no se elige desde los metadatos', async () => {
    const sneaky = await createUser('client', { rol: 'admin' })
    try {
      const { data } = await service.from('profiles').select('rol').eq('id', sneaky.id).single()
      expect(data?.rol).toBe('client')
    } finally {
      await deleteUsers(sneaky)
    }
  })

  it('un cliente lee su propio profile', async () => {
    const { data, error } = await clientA.db.from('profiles').select('id')
    expect(error).toBeNull()
    expect(data).toEqual([{ id: clientA.id }])
  })

  it('un cliente no puede ver el profile de otro', async () => {
    const { data, error } = await clientA.db.from('profiles').select('id').eq('id', clientB.id)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('un cliente no puede modificar su profile (ni cambiarse el rol)', async () => {
    const { data } = await clientA.db
      .from('profiles')
      .update({ rol: 'admin', nombre: 'Hack' })
      .eq('id', clientA.id)
      .select()
    expect(data).toEqual([])

    const { data: row } = await service
      .from('profiles')
      .select('rol, nombre')
      .eq('id', clientA.id)
      .single()
    expect(row).toEqual({ rol: 'client', nombre: 'Ana' })
  })

  it('is_admin() distingue admin de cliente', async () => {
    expect((await admin.db.rpc('is_admin')).data).toBe(true)
    expect((await clientA.db.rpc('is_admin')).data).toBe(false)
  })

  it('un admin ve y edita los profiles de los clientes', async () => {
    const { data } = await admin.db
      .from('profiles')
      .select('id')
      .in('id', [admin.id, clientA.id, clientB.id])
    expect(data).toHaveLength(3)

    const { data: updated, error } = await admin.db
      .from('profiles')
      .update({ notas: 'Lesión de rodilla' })
      .eq('id', clientB.id)
      .select('notas')
    expect(error).toBeNull()
    expect(updated).toEqual([{ notas: 'Lesión de rodilla' }])
  })

  it('nadie puede borrar profiles (baja lógica)', async () => {
    const { data } = await admin.db.from('profiles').delete().eq('id', clientB.id).select()
    expect(data).toEqual([])
  })

  it('un usuario anónimo no ve profiles', async () => {
    const { data } = await anonClient().from('profiles').select('id')
    expect(data).toEqual([])
  })

  it('no hay registro público', async () => {
    const { error } = await anonClient().auth.signUp({
      email: 'publico@depysal.test',
      password: 'una-clave-cualquiera',
    })
    expect(error).not.toBeNull()
  })
})
