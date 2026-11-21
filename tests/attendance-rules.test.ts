import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createUser, deleteUsers, randomDni, service, type TestUser } from './helpers'

// Regla "Debe abonar" (SPEC §2.4): el trigger check_attendance_allowed solo deja registrar
// una asistencia si en esa fecha hay un período con clases disponibles.

const users: TestUser[] = []
const plans = { p8: 0, libre: 0 }
let admin: TestUser

async function newClient(payments: { fecha: string; plan: 'p8' | 'libre'; anulado?: boolean }[]) {
  const user = await createUser('client', { dni: randomDni() })
  users.push(user)
  for (const p of payments) {
    const { error } = await service.from('payments').insert({
      client_id: user.id,
      plan_id: plans[p.plan],
      monto: 1000,
      medio: 'efectivo',
      fecha_pago: p.fecha,
      anulado: p.anulado ?? false,
    })
    if (error) throw error
  }
  return user
}

/** Registra una asistencia como admin (por la API, con RLS) y devuelve el mensaje de error. */
async function register(clientId: string, fecha: string): Promise<string | null> {
  const { error } = await admin.db.from('attendances').insert({ client_id: clientId, fecha })
  return error?.message ?? null
}

async function registerAll(clientId: string, fechas: string[]) {
  for (const fecha of fechas) expect(await register(clientId, fecha)).toBeNull()
}

const ocho = [
  '2026-03-01',
  '2026-03-03',
  '2026-03-05',
  '2026-03-08',
  '2026-03-10',
  '2026-03-13',
  '2026-03-15',
  '2026-03-20',
]

beforeAll(async () => {
  admin = await createUser('admin')
  const { data, error } = await service
    .from('plans')
    .insert([
      { nombre: 'Regla 8 clases', precio: 1000, clases: 8 },
      { nombre: 'Regla pase libre', precio: 1000, clases: null },
    ])
    .select('id, clases')
  if (error) throw error
  plans.p8 = data.find((p) => p.clases === 8)?.id ?? 0
  plans.libre = data.find((p) => p.clases === null)?.id ?? 0
})

afterAll(async () => {
  const ids = users.map((u) => u.id)
  await service.from('attendances').delete().in('client_id', ids)
  await service.from('payments').delete().in('client_id', ids)
  await service.from('plans').delete().in('id', [plans.p8, plans.libre])
  await deleteUsers(admin, ...users)
})

describe('asistencias: regla "Debe abonar"', () => {
  it('sin pagos no se registra', async () => {
    const c = await newClient([])
    expect(await register(c.id, '2026-03-01')).toBe('debe_abonar')
  })

  it('con un período vigente con clases se registra', async () => {
    const c = await newClient([{ fecha: '2026-03-01', plan: 'p8' }])
    expect(await register(c.id, '2026-03-01')).toBeNull()
    expect(await register(c.id, '2026-03-30')).toBeNull()
  })

  it('antes de la fecha de pago o después de vencer por fecha no se registra', async () => {
    const c = await newClient([{ fecha: '2026-03-01', plan: 'p8' }])
    expect(await register(c.id, '2026-02-28')).toBe('debe_abonar')
    expect(await register(c.id, '2026-03-31')).toBe('debe_abonar')
  })

  it('después de usar todas las clases no se registra hasta que pague', async () => {
    const c = await newClient([{ fecha: '2026-03-01', plan: 'p8' }])
    await registerAll(c.id, ocho)
    expect(await register(c.id, '2026-03-22')).toBe('debe_abonar')

    await service.from('payments').insert({
      client_id: c.id,
      plan_id: plans.p8,
      monto: 1000,
      medio: 'efectivo',
      fecha_pago: '2026-03-25',
    })
    expect(await register(c.id, '2026-03-22')).toBe('debe_abonar') // sigue sin período ese día
    expect(await register(c.id, '2026-03-25')).toBeNull()
  })

  it('con el siguiente ya pago, puede seguir al día siguiente de la última clase', async () => {
    const c = await newClient([
      { fecha: '2026-03-01', plan: 'p8' },
      { fecha: '2026-03-05', plan: 'p8' },
    ])
    await registerAll(c.id, ocho)
    expect(await register(c.id, '2026-03-21')).toBeNull()
  })

  it('el pase libre no registra asistencias', async () => {
    const c = await newClient([{ fecha: '2026-03-01', plan: 'libre' }])
    expect(await register(c.id, '2026-03-02')).toBe('pase_libre')
  })

  it('un pago anulado no habilita asistencias', async () => {
    const c = await newClient([{ fecha: '2026-03-01', plan: 'p8', anulado: true }])
    expect(await register(c.id, '2026-03-02')).toBe('debe_abonar')
  })
})
