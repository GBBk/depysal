import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createUser, deleteUsers, randomDni, service, type TestUser } from './helpers'

// T15: save_routine y assign_routine.

let admin: TestUser
let client: TestUser
let otherClient: TestUser
const exercises: number[] = []
let templateId: number
const createdRoutines: number[] = []

type Item = { dia: string; orden: number; exercise_id: number; series: number; reps: string }

async function items(routineId: number): Promise<Item[]> {
  const { data, error } = await service
    .from('routine_items')
    .select('dia, orden, exercise_id, series, reps')
    .eq('routine_id', routineId)
    .order('dia')
    .order('orden')
  if (error) throw error
  return data
}

async function assign(as: TestUser, clientId: string, template: number | null, nombre = '') {
  return as.db.rpc('assign_routine', {
    p_client_id: clientId,
    ...(template === null ? {} : { p_template_id: template }),
    p_nombre: nombre,
  })
}

beforeAll(async () => {
  admin = await createUser('admin')
  client = await createUser('client', { dni: randomDni() })
  otherClient = await createUser('client', { dni: randomDni() })

  for (const nombre of ['A', 'B', 'C']) {
    const { data, error } = await service
      .from('exercises')
      .insert({
        nombre: `Test ${nombre} ${randomUUID()}`,
        grupo_muscular: 'Pecho',
        equipo: 'Barra',
      })
      .select('id')
      .single()
    if (error) throw error
    exercises.push(data.id)
  }

  const { data, error } = await service
    .from('routines')
    .insert({ nombre: `Plantilla ${randomUUID()}`, es_plantilla: true })
    .select('id')
    .single()
  if (error) throw error
  templateId = data.id
  createdRoutines.push(templateId)

  const { error: saveError } = await admin.db.rpc('save_routine', {
    p_routine_id: templateId,
    p_nombre: 'Plantilla de prueba',
    p_items: [
      { dia: 'A', orden: 0, exercise_id: exercises[0], series: 4, reps: '8-10', descanso_seg: 90 },
      { dia: 'A', orden: 1, exercise_id: exercises[1], series: 3, reps: '12', descanso_seg: null },
      { dia: 'B', orden: 0, exercise_id: exercises[2], series: 3, reps: 'al fallo', notas: '  ' },
    ],
  })
  if (saveError) throw saveError
})

afterAll(async () => {
  const { data } = await service
    .from('routines')
    .select('id')
    .in('client_id', [client.id, otherClient.id])
  const ids = [...createdRoutines, ...(data ?? []).map((r) => r.id)]
  await service.from('routines').delete().in('id', ids)
  await service.from('exercises').delete().in('id', exercises)
  await deleteUsers(admin, client, otherClient)
})

describe('save_routine', () => {
  it('guarda nombre e ítems en el orden indicado (notas vacías quedan null)', async () => {
    const { data } = await service.from('routines').select('nombre').eq('id', templateId).single()
    expect(data?.nombre).toBe('Plantilla de prueba')
    expect(await items(templateId)).toEqual([
      { dia: 'A', orden: 0, exercise_id: exercises[0], series: 4, reps: '8-10' },
      { dia: 'A', orden: 1, exercise_id: exercises[1], series: 3, reps: '12' },
      { dia: 'B', orden: 0, exercise_id: exercises[2], series: 3, reps: 'al fallo' },
    ])
    const { data: notas } = await service
      .from('routine_items')
      .select('notas')
      .eq('routine_id', templateId)
      .eq('dia', 'B')
      .single()
    expect(notas?.notas).toBeNull()
  })

  it('si un ítem es inválido no guarda nada (es atómica)', async () => {
    const { error } = await admin.db.rpc('save_routine', {
      p_routine_id: templateId,
      p_nombre: 'Cambio que no debe quedar',
      p_items: [{ dia: 'Z', orden: 0, exercise_id: exercises[0], series: 3, reps: '10' }],
    })
    expect(error).not.toBeNull()
    const { data } = await service.from('routines').select('nombre').eq('id', templateId).single()
    expect(data?.nombre).toBe('Plantilla de prueba')
    expect(await items(templateId)).toHaveLength(3)
  })

  it('un cliente no puede guardar rutinas, ni la propia', async () => {
    const { data: id } = await assign(admin, client.id, templateId)
    const { error } = await client.db.rpc('save_routine', {
      p_routine_id: id ?? -1,
      p_nombre: 'Hack',
      p_items: [],
    })
    expect(error?.message).toBe('rutina_no_encontrada')
    expect(await items(id ?? -1)).toHaveLength(3)
  })
})

describe('assign_routine', () => {
  it('desde una plantilla copia los ítems; editar la copia no cambia la plantilla', async () => {
    const { data: copyId, error } = await assign(admin, otherClient.id, templateId, 'Mi rutina')
    expect(error).toBeNull()
    const copy = copyId ?? -1

    const { data: routine } = await service
      .from('routines')
      .select('nombre, es_plantilla, client_id, activa')
      .eq('id', copy)
      .single()
    expect(routine).toEqual({
      nombre: 'Mi rutina',
      es_plantilla: false,
      client_id: otherClient.id,
      activa: true,
    })
    expect(await items(copy)).toEqual(await items(templateId))

    await admin.db.rpc('save_routine', {
      p_routine_id: copy,
      p_nombre: 'Mi rutina editada',
      p_items: [{ dia: 'A', orden: 0, exercise_id: exercises[2], series: 5, reps: '5' }],
    })
    expect(await items(copy)).toHaveLength(1)
    expect(await items(templateId)).toHaveLength(3)
    const { data: template } = await service
      .from('routines')
      .select('nombre')
      .eq('id', templateId)
      .single()
    expect(template?.nombre).toBe('Plantilla de prueba')
  })

  it('sin nombre usa el de la plantilla; la rutina anterior pasa a inactiva', async () => {
    const { data: first } = await assign(admin, otherClient.id, null, 'Desde cero')
    const { data: second } = await assign(admin, otherClient.id, templateId)

    const { data } = await service
      .from('routines')
      .select('id, nombre, activa')
      .in('id', [first ?? -1, second ?? -1])
      .order('id')
    expect(data).toEqual([
      { id: first, nombre: 'Desde cero', activa: false },
      { id: second, nombre: 'Plantilla de prueba', activa: true },
    ])
    expect(await items(first ?? -1)).toEqual([])
  })

  it('solo el admin asigna rutinas', async () => {
    const { error } = await assign(client, client.id, templateId)
    expect(error?.message).toBe('solo_admin')
  })

  it('rechaza una plantilla que no es plantilla o un cliente que no existe', async () => {
    const { data: routineId } = await assign(admin, otherClient.id, null, 'No plantilla')
    const noTemplate = await assign(admin, client.id, routineId ?? -1)
    expect(noTemplate.error?.message).toBe('plantilla_no_encontrada')

    const noClient = await assign(admin, admin.id, templateId)
    expect(noClient.error?.message).toBe('cliente_no_encontrado')
  })
})

describe('plantillas de ejemplo del seed', () => {
  it('están las 3 plantillas con sus ejercicios', async () => {
    const { data } = await service
      .from('routines')
      .select('nombre, routine_items(count)')
      .eq('es_plantilla', true)
      .in('nombre', ['Cuerpo completo 3 días', 'Torso / Pierna 4 días', 'Empuje / Tirón / Pierna'])
    expect(data).toHaveLength(3)
    for (const t of data ?? []) {
      expect(t.routine_items[0]?.count, t.nombre).toBeGreaterThan(10)
    }
  })
})
