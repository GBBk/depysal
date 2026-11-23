import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createUser, deleteUsers, randomDni, service, type TestUser } from './helpers'

// T18: correcciones y huecos de tests que marcó la revisión de seguridad.

let admin: TestUser
let inactiveAdmin: TestUser
let client: TestUser
let inactiveClient: TestUser
let planId: number
let exerciseId: number
const routines = { vieja: 0, activa: 0 }
const photoPath = `tests/${randomUUID()}.png`
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

async function routine(nombre: string, activa: boolean) {
  const { data, error } = await service
    .from('routines')
    .insert({ nombre, client_id: client.id, activa })
    .select('id')
    .single()
  if (error) throw error
  const items = await service
    .from('routine_items')
    .insert({
      routine_id: data.id,
      dia: 'A',
      orden: 0,
      exercise_id: exerciseId,
      series: 3,
      reps: '10',
    })
  if (items.error) throw items.error
  return data.id
}

beforeAll(async () => {
  admin = await createUser('admin')
  inactiveAdmin = await createUser('admin')
  client = await createUser('client', { dni: randomDni() })
  inactiveClient = await createUser('client', { dni: randomDni() })
  await service
    .from('profiles')
    .update({ activo: false })
    .in('id', [inactiveAdmin.id, inactiveClient.id])

  const plan = await service
    .from('plans')
    .insert({ nombre: `Plan ${randomUUID()}`, precio: 1000, clases: 8 })
    .select('id')
    .single()
  if (plan.error) throw plan.error
  planId = plan.data.id

  const ex = await service
    .from('exercises')
    .insert({ nombre: `Test ${randomUUID()}`, grupo_muscular: 'Pecho', equipo: 'Barra' })
    .select('id')
    .single()
  if (ex.error) throw ex.error
  exerciseId = ex.data.id

  routines.vieja = await routine('Vieja', false)
  routines.activa = await routine('Activa', true)

  const up = await admin.db.storage
    .from('exercise-images')
    .upload(photoPath, png, { contentType: 'image/png' })
  if (up.error) throw up.error
})

afterAll(async () => {
  await service.storage.from('exercise-images').remove([photoPath])
  await service.from('routines').delete().in('id', Object.values(routines))
  await service.from('payments').delete().eq('plan_id', planId)
  await service.from('plans').delete().eq('id', planId)
  await service.from('exercises').delete().eq('id', exerciseId)
  await deleteUsers(admin, inactiveAdmin, client, inactiveClient)
})

describe('admin dado de baja (M1)', () => {
  it('deja de ser admin: is_admin() es false y no ve a los clientes', async () => {
    expect((await inactiveAdmin.db.rpc('is_admin')).data).toBe(false)
    const { data } = await inactiveAdmin.db.from('profiles').select('id')
    expect(data).toEqual([{ id: inactiveAdmin.id }])
  })

  it('la Edge Function create-client le responde 403', async () => {
    const { data: session } = await inactiveAdmin.db.auth.getSession()
    const res = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/create-client`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.VITE_SUPABASE_ANON_KEY ?? '',
        Authorization: `Bearer ${session.session?.access_token ?? ''}`,
      },
      body: JSON.stringify({
        nombre: 'X',
        apellido: 'Y',
        dni: randomDni(),
        email: `x-${randomUUID()}@deporteysalud.test`,
        password: randomUUID(),
      }),
    })
    expect(res.status).toBe(403)
  })
})

describe('planes (L1)', () => {
  it('un cliente activo ve los planes; uno dado de baja, no', async () => {
    expect((await client.db.from('plans').select('id').eq('id', planId)).data).toHaveLength(1)
    expect((await inactiveClient.db.from('plans').select('id')).data).toEqual([])
  })
})

describe('payments.clases (L2)', () => {
  it('no se puede cambiar a mano; solo cambia si cambia el plan', async () => {
    const { data: pago } = await admin.db
      .from('payments')
      .insert({
        client_id: client.id,
        plan_id: planId,
        monto: 1000,
        medio: 'efectivo',
        fecha_pago: '2026-03-01',
      })
      .select('id, clases')
      .single()
    expect(pago?.clases).toBe(8)
    const id = pago?.id ?? -1

    const { data: editado } = await admin.db
      .from('payments')
      .update({ clases: 999 })
      .eq('id', id)
      .select('clases')
      .single()
    expect(editado?.clases).toBe(8)

    // Si después se edita el plan, el pago conserva las clases que tenía al pagarse.
    await service.from('plans').update({ clases: 12 }).eq('id', planId)
    const { data: otraEdicion } = await admin.db
      .from('payments')
      .update({ monto: 900 })
      .eq('id', id)
      .select('clases')
      .single()
    expect(otraEdicion?.clases).toBe(8)
  })
})

describe('huecos de tests de la revisión', () => {
  it('un cliente no puede pisar una foto existente (upsert)', async () => {
    const { error } = await client.db.storage
      .from('exercise-images')
      .upload(photoPath, png, { contentType: 'image/png', upsert: true })
    expect(error).not.toBeNull()
  })

  it('un cliente no puede mover una marca de día hecho (no hay UPDATE)', async () => {
    const { data: marca } = await client.db
      .from('routine_completions')
      .insert({ routine_id: routines.activa, dia: 'A', fecha: '2026-03-01' })
      .select('id')
      .single()
    const { data } = await client.db
      .from('routine_completions')
      .update({ fecha: '2026-03-02' })
      .eq('id', marca?.id ?? -1)
      .select()
    expect(data).toEqual([])
  })

  it('un cliente no puede borrar marcas de su rutina vieja', async () => {
    const { data: marca } = await service
      .from('routine_completions')
      .insert({ routine_id: routines.vieja, dia: 'A', fecha: '2026-02-01' })
      .select('id')
      .single()
    const { data } = await client.db
      .from('routine_completions')
      .delete()
      .eq('id', marca?.id ?? -1)
      .select()
    expect(data).toEqual([])
    const sigue = await service
      .from('routine_completions')
      .select('id')
      .eq('id', marca?.id ?? -1)
    expect(sigue.data).toHaveLength(1)
  })
})
