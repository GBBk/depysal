import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, createUser, deleteUsers, randomDni, service, type TestUser } from './helpers'

// T12: exercises, routines, routine_items, routine_completions y el bucket exercise-images.

let admin: TestUser
let clientA: TestUser
let clientB: TestUser
let inactive: TestUser

let exerciseId: number
const routines = { plantilla: 0, activaA: 0, viejaA: 0, activaB: 0, activaInactive: 0 }
const storagePath = `tests/${randomUUID()}.png`

// PNG de 1x1 píxel.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

async function newRoutine(
  nombre: string,
  opts: { client?: TestUser; activa?: boolean; dias?: string[] },
): Promise<number> {
  const { data, error } = await service
    .from('routines')
    .insert({
      nombre,
      es_plantilla: !opts.client,
      client_id: opts.client?.id ?? null,
      activa: opts.activa ?? false,
    })
    .select('id')
    .single()
  if (error) throw error
  const items = (opts.dias ?? ['A']).map((dia, orden) => ({
    routine_id: data.id,
    dia,
    orden,
    exercise_id: exerciseId,
    series: 3,
    reps: '10-12',
    descanso_seg: 60,
  }))
  const { error: itemsError } = await service.from('routine_items').insert(items)
  if (itemsError) throw itemsError
  return data.id
}

beforeAll(async () => {
  admin = await createUser('admin')
  clientA = await createUser('client', { dni: randomDni() })
  clientB = await createUser('client', { dni: randomDni() })
  inactive = await createUser('client', { dni: randomDni() })

  const { data, error } = await service
    .from('exercises')
    .insert({ nombre: `Test press ${randomUUID()}`, grupo_muscular: 'Pecho', equipo: 'Barra' })
    .select('id')
    .single()
  if (error) throw error
  exerciseId = data.id

  routines.plantilla = await newRoutine('Plantilla test', { dias: ['A', 'B'] })
  routines.viejaA = await newRoutine('Vieja A', { client: clientA, activa: false })
  routines.activaA = await newRoutine('Activa A', {
    client: clientA,
    activa: true,
    dias: ['A', 'B'],
  })
  routines.activaB = await newRoutine('Activa B', { client: clientB, activa: true })
  routines.activaInactive = await newRoutine('Activa inactivo', { client: inactive, activa: true })

  await service.from('profiles').update({ activo: false }).eq('id', inactive.id)
})

afterAll(async () => {
  await service.storage.from('exercise-images').remove([storagePath])
  await service.from('routines').delete().in('id', Object.values(routines))
  await service.from('exercises').delete().eq('id', exerciseId)
  await deleteUsers(admin, clientA, clientB, inactive)
})

describe('rutinas: lo que ve cada uno', () => {
  it('un cliente ve solo su rutina activa: ni la vieja, ni plantillas, ni la de otro', async () => {
    const { data } = await clientA.db.from('routines').select('id')
    expect(data).toEqual([{ id: routines.activaA }])
  })

  it('un cliente ve solo los ítems de su rutina activa', async () => {
    const { data } = await clientA.db.from('routine_items').select('routine_id, dia')
    expect(data?.every((i) => i.routine_id === routines.activaA)).toBe(true)
    expect(data?.map((i) => i.dia).sort()).toEqual(['A', 'B'])
  })

  it('un cliente inactivo no ve su rutina, ni ítems, ni ejercicios', async () => {
    expect((await inactive.db.from('routines').select('id')).data).toEqual([])
    expect((await inactive.db.from('routine_items').select('id')).data).toEqual([])
    expect((await inactive.db.from('exercises').select('id')).data).toEqual([])
  })

  it('un cliente activo ve los ejercicios pero no los modifica', async () => {
    const { data } = await clientA.db.from('exercises').select('id').eq('id', exerciseId)
    expect(data).toHaveLength(1)

    const { error } = await clientA.db
      .from('exercises')
      .insert({ nombre: 'Hack', grupo_muscular: 'Pecho', equipo: 'Barra' })
    expect(error).not.toBeNull()

    const { data: updated } = await clientA.db
      .from('exercises')
      .update({ nombre: 'Hack' })
      .eq('id', exerciseId)
      .select()
    expect(updated).toEqual([])
  })

  it('un cliente no modifica rutinas ni ítems', async () => {
    const { data: r } = await clientA.db
      .from('routines')
      .update({ nombre: 'Hack' })
      .eq('id', routines.activaA)
      .select()
    expect(r).toEqual([])

    const { data: i } = await clientA.db
      .from('routine_items')
      .delete()
      .eq('routine_id', routines.activaA)
      .select()
    expect(i).toEqual([])
  })

  it('el admin ve todas las rutinas, incluidas las plantillas', async () => {
    const { data } = await admin.db.from('routines').select('id').in('id', Object.values(routines))
    expect(data).toHaveLength(5)
  })
})

describe('rutinas: restricciones', () => {
  it('como máximo una rutina activa por cliente', async () => {
    const { error } = await service
      .from('routines')
      .insert({ nombre: 'Otra activa', client_id: clientA.id, activa: true })
    expect(error?.code).toBe('23505')
  })

  it('una plantilla no tiene cliente ni está activa; una rutina común sí tiene cliente', async () => {
    const conCliente = await service
      .from('routines')
      .insert({ nombre: 'Mal', es_plantilla: true, client_id: clientA.id })
    expect(conCliente.error?.code).toBe('23514')

    const activa = await service
      .from('routines')
      .insert({ nombre: 'Mal', es_plantilla: true, activa: true })
    expect(activa.error?.code).toBe('23514')

    const sinCliente = await service.from('routines').insert({ nombre: 'Mal' })
    expect(sinCliente.error?.code).toBe('23514')
  })

  it('un ejercicio usado en una rutina no se puede borrar', async () => {
    const { error } = await admin.db.from('exercises').delete().eq('id', exerciseId)
    expect(error?.code).toBe('23503')
  })

  it('borrar una rutina borra sus ítems y sus marcas', async () => {
    const id = await newRoutine('Para borrar', { client: clientB, activa: false })
    await service
      .from('routine_completions')
      .insert({ routine_id: id, dia: 'A', fecha: '2026-03-01' })

    const { error } = await admin.db.from('routines').delete().eq('id', id)
    expect(error).toBeNull()
    expect((await service.from('routine_items').select('id').eq('routine_id', id)).data).toEqual([])
    expect(
      (await service.from('routine_completions').select('id').eq('routine_id', id)).data,
    ).toEqual([])
  })
})

describe('días hechos', () => {
  it('un cliente marca un día de su rutina activa (client_id lo pone la base)', async () => {
    const { data, error } = await clientA.db
      .from('routine_completions')
      .insert({
        routine_id: routines.activaA,
        dia: 'A',
        fecha: '2026-03-02',
        client_id: clientB.id,
      })
      .select('client_id')
      .single()
    expect(error).toBeNull()
    expect(data?.client_id).toBe(clientA.id)
  })

  it('una sola marca por día de rutina y fecha', async () => {
    await clientA.db
      .from('routine_completions')
      .insert({ routine_id: routines.activaA, dia: 'B', fecha: '2026-03-03' })
    const { error } = await clientA.db
      .from('routine_completions')
      .insert({ routine_id: routines.activaA, dia: 'B', fecha: '2026-03-03' })
    expect(error?.code).toBe('23505')
  })

  it('no puede marcar en la rutina de otro, en su rutina vieja ni un día que no existe', async () => {
    const otra = await clientA.db
      .from('routine_completions')
      .insert({ routine_id: routines.activaB, dia: 'A', fecha: '2026-03-04' })
    expect(otra.error).not.toBeNull()

    const vieja = await clientA.db
      .from('routine_completions')
      .insert({ routine_id: routines.viejaA, dia: 'A', fecha: '2026-03-04' })
    expect(vieja.error).not.toBeNull()

    const sinDia = await clientA.db
      .from('routine_completions')
      .insert({ routine_id: routines.activaA, dia: 'C', fecha: '2026-03-04' })
    expect(sinDia.error).not.toBeNull()
  })

  it('un cliente inactivo no puede marcar días', async () => {
    const { error } = await inactive.db
      .from('routine_completions')
      .insert({ routine_id: routines.activaInactive, dia: 'A', fecha: '2026-03-04' })
    expect(error).not.toBeNull()
  })

  it('un cliente no ve las marcas de otro; el admin ve todas', async () => {
    await clientB.db
      .from('routine_completions')
      .insert({ routine_id: routines.activaB, dia: 'A', fecha: '2026-03-05' })

    const { data: deA } = await clientA.db.from('routine_completions').select('client_id')
    expect(deA?.length).toBeGreaterThan(0)
    expect(deA?.every((c) => c.client_id === clientA.id)).toBe(true)

    const { data: delAdmin } = await admin.db
      .from('routine_completions')
      .select('client_id')
      .in('routine_id', [routines.activaA, routines.activaB])
    expect(new Set(delAdmin?.map((c) => c.client_id))).toEqual(new Set([clientA.id, clientB.id]))
  })

  it('un cliente borra sus marcas pero no las de otro', async () => {
    const { data: ajena } = await clientA.db
      .from('routine_completions')
      .delete()
      .eq('routine_id', routines.activaB)
      .select()
    expect(ajena).toEqual([])

    const { data: propia } = await clientA.db
      .from('routine_completions')
      .delete()
      .eq('routine_id', routines.activaA)
      .eq('fecha', '2026-03-02')
      .select('id')
    expect(propia).toHaveLength(1)
  })
})

describe('fotos de ejercicios (Storage)', () => {
  const bucket = 'exercise-images'

  it('solo el admin sube fotos', async () => {
    const asClient = await clientA.db.storage
      .from(bucket)
      .upload(storagePath, png, { contentType: 'image/png' })
    expect(asClient.error).not.toBeNull()

    const asAdmin = await admin.db.storage
      .from(bucket)
      .upload(storagePath, png, { contentType: 'image/png' })
    expect(asAdmin.error).toBeNull()
  })

  it('un cliente activo puede ver las fotos; uno inactivo o sin sesión, no', async () => {
    const activo = await clientA.db.storage.from(bucket).createSignedUrl(storagePath, 60)
    expect(activo.error).toBeNull()

    const inactivo = await inactive.db.storage.from(bucket).createSignedUrl(storagePath, 60)
    expect(inactivo.error).not.toBeNull()

    const anonimo = await anonClient().storage.from(bucket).createSignedUrl(storagePath, 60)
    expect(anonimo.error).not.toBeNull()
  })

  it('un cliente no borra fotos', async () => {
    const { data } = await clientA.db.storage.from(bucket).remove([storagePath])
    expect(data).toEqual([])
    const sigue = await admin.db.storage.from(bucket).createSignedUrl(storagePath, 60)
    expect(sigue.error).toBeNull()
  })
})
