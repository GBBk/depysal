import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, createUser, deleteUsers, randomDni, service, type TestUser } from './helpers'

const functionUrl = `${process.env.VITE_SUPABASE_URL}/functions/v1/create-client`

function newClientBody() {
  return {
    nombre: 'Carla',
    apellido: 'Ruiz',
    dni: randomDni(),
    telefono: '3415551234',
    email: `nuevo-${randomUUID()}@deporteysalud.test`,
    notas: 'Lesión de hombro',
    password: randomUUID(),
  }
}

async function callAs(user: TestUser | null, body: unknown) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: process.env.VITE_SUPABASE_ANON_KEY ?? '',
  }
  if (user) {
    const { data } = await user.db.auth.getSession()
    headers.Authorization = `Bearer ${data.session?.access_token ?? ''}`
  }
  const res = await fetch(functionUrl, { method: 'POST', headers, body: JSON.stringify(body) })
  const json: unknown = await res.json()
  return { status: res.status, json }
}

describe('Edge Function create-client', () => {
  let admin: TestUser
  let client: TestUser
  const createdIds: string[] = []

  beforeAll(async () => {
    admin = await createUser('admin')
    client = await createUser('client', { dni: randomDni() })
  })

  afterAll(async () => {
    // Si un test falla, puede haber quedado un id vacío: se saltea para limpiar el resto igual.
    for (const id of createdIds) if (id) await service.auth.admin.deleteUser(id)
    await deleteUsers(admin, client)
  })

  it('rechaza llamadas sin sesión', async () => {
    const { status } = await callAs(null, newClientBody())
    expect(status).toBe(401)
  })

  it('devuelve 403 si la llama un cliente', async () => {
    const { status } = await callAs(client, newClientBody())
    expect(status).toBe(403)
  })

  it('un admin crea un cliente que puede iniciar sesión', async () => {
    const body = newClientBody()
    const { status, json } = await callAs(admin, body)
    expect(status).toBe(201)
    const { id } = json as { id: string }
    createdIds.push(id)

    const { data: profile } = await service
      .from('profiles')
      .select('rol, nombre, apellido, dni, telefono, email, notas, activo')
      .eq('id', id)
      .single()
    expect(profile).toEqual({
      rol: 'client',
      nombre: body.nombre,
      apellido: body.apellido,
      dni: body.dni,
      telefono: body.telefono,
      email: body.email,
      notas: body.notas,
      activo: true,
    })

    const { error } = await anonClient().auth.signInWithPassword({
      email: body.email,
      password: body.password,
    })
    expect(error).toBeNull()
  })

  it('rechaza un DNI repetido', async () => {
    const first = newClientBody()
    const res1 = await callAs(admin, first)
    createdIds.push((res1.json as { id: string }).id)

    const res2 = await callAs(admin, { ...newClientBody(), dni: first.dni })
    expect(res2.status).toBe(409)
    expect(res2.json).toMatchObject({ field: 'dni' })
  })

  it('rechaza un email repetido', async () => {
    const { status, json } = await callAs(admin, { ...newClientBody(), email: client.email })
    expect(status).toBe(409)
    expect(json).toMatchObject({ field: 'email' })
  })

  it('rechaza datos inválidos', async () => {
    const { status } = await callAs(admin, { ...newClientBody(), email: 'no-es-un-email' })
    expect(status).toBe(400)
  })
})
