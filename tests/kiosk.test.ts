import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, createUser, deleteUsers, randomDni, service, type TestUser } from './helpers'

// T18d: kiosco de asistencias (SPEC §2.4 y §4). La cuenta 'kiosk' no lee nada y solo registra
// la asistencia de hoy con kiosk_check_in(dni).

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Hoy en Argentina, igual que la función. */
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires',
}).format(new Date())
const T = (days: number) => addDays(today, days)

const users: TestUser[] = []
const plans = { p8: 0, libre: 0 }
const photoPath = `tests/${randomUUID()}.png`
let kiosk: TestUser
let inactiveKiosk: TestUser
let admin: TestUser

type Plan = keyof typeof plans

async function newClient(
  payments: { fecha: string; plan: Plan }[] = [],
  attendances: string[] = [],
  meta: { nombre?: string; apellido?: string } = {},
) {
  const dni = randomDni()
  const user = await createUser('client', { dni, ...meta })
  users.push(user)
  for (const p of payments) {
    const { error } = await service.from('payments').insert({
      client_id: user.id,
      plan_id: plans[p.plan],
      monto: 1000,
      medio: 'efectivo',
      fecha_pago: p.fecha,
    })
    if (error) throw error
  }
  for (const fecha of attendances) {
    const { error } = await service.from('attendances').insert({ client_id: user.id, fecha })
    if (error) throw error
  }
  return { ...user, dni }
}

async function checkIn(dni: string, as: TestUser = kiosk) {
  const { data, error } = await as.db.rpc('kiosk_check_in', { p_dni: dni })
  if (error) throw error
  expect(data).toHaveLength(1)
  return data[0]
}

async function attendancesOf(clientId: string) {
  const { data, error } = await service
    .from('attendances')
    .select('fecha, created_by')
    .eq('client_id', clientId)
    .order('fecha')
  if (error) throw error
  return data
}

beforeAll(async () => {
  kiosk = await createUser('kiosk')
  inactiveKiosk = await createUser('kiosk')
  admin = await createUser('admin')
  const off = await service.from('profiles').update({ activo: false }).eq('id', inactiveKiosk.id)
  if (off.error) throw off.error

  const { data, error } = await service
    .from('plans')
    .insert([
      { nombre: `Kiosco 8 ${randomUUID()}`, precio: 1000, clases: 8 },
      { nombre: `Kiosco libre ${randomUUID()}`, precio: 1000, clases: null },
    ])
    .select('id, clases')
  if (error) throw error
  plans.p8 = data.find((p) => p.clases === 8)?.id ?? 0
  plans.libre = data.find((p) => p.clases === null)?.id ?? 0

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
  )
  const upload = await service.storage
    .from('exercise-images')
    .upload(photoPath, png, { contentType: 'image/png' })
  if (upload.error) throw upload.error
})

afterAll(async () => {
  const ids = users.map((u) => u.id)
  await service.from('attendances').delete().in('client_id', ids)
  await service.from('payments').delete().in('client_id', ids)
  await service.from('plans').delete().in('id', [plans.p8, plans.libre])
  await service.storage.from('exercise-images').remove([photoPath])
  await deleteUsers(kiosk, inactiveKiosk, admin, ...users)
})

describe('kiosk_check_in', () => {
  it('registra la asistencia de hoy y devuelve solo el nombre de pila y las clases', async () => {
    const c = await newClient([{ fecha: T(-3), plan: 'p8' }], [T(-3), T(-2)], {
      nombre: 'Ana',
      apellido: 'Pérez',
    })

    const result = await checkIn(c.dni)
    expect(result).toEqual({
      resultado: 'registrada',
      nombre: 'Ana',
      clases_restantes: 5,
      hasta: T(26),
      tiene_periodo_en_espera: false,
    })
    // Queda registrada hoy y a nombre del kiosco.
    expect(await attendancesOf(c.id)).toEqual([
      { fecha: T(-3), created_by: null },
      { fecha: T(-2), created_by: null },
      { fecha: today, created_by: kiosk.id },
    ])
  })

  it('acepta el DNI con puntos y espacios', async () => {
    const c = await newClient([{ fecha: today, plan: 'p8' }])
    const conPuntos = ` ${c.dni.slice(0, 2)}.${c.dni.slice(2, 5)}.${c.dni.slice(5)} `
    expect((await checkIn(conPuntos)).resultado).toBe('registrada')
  })

  it('una segunda vez el mismo día no descuenta otra clase', async () => {
    const c = await newClient([{ fecha: T(-1), plan: 'p8' }])
    expect(await checkIn(c.dni)).toMatchObject({ resultado: 'registrada', clases_restantes: 7 })
    expect(await checkIn(c.dni)).toMatchObject({ resultado: 'ya_registrada', clases_restantes: 7 })
    expect(await attendancesOf(c.id)).toHaveLength(1)
  })

  it('si usó su última clase hoy, dice que ya vino (no "Debe abonar")', async () => {
    const siete = [-7, -6, -5, -4, -3, -2, -1].map(T)
    const c = await newClient([{ fecha: T(-8), plan: 'p8' }], siete)
    expect(await checkIn(c.dni)).toMatchObject({ resultado: 'registrada', clases_restantes: 0 })
    expect(await checkIn(c.dni)).toMatchObject({ resultado: 'ya_registrada', clases_restantes: 0 })
  })

  it('sin período vigente: Debe abonar, y no registra nada', async () => {
    const sinPagos = await newClient()
    const usoTodo = await newClient(
      [{ fecha: T(-10), plan: 'p8' }],
      [-10, -9, -8, -7, -6, -5, -4, -3].map(T),
    )
    expect(await checkIn(sinPagos.dni)).toMatchObject({ resultado: 'debe_abonar' })
    expect(await checkIn(usoTodo.dni)).toMatchObject({ resultado: 'debe_abonar' })
    expect(await attendancesOf(sinPagos.id)).toHaveLength(0)
    expect(await attendancesOf(usoTodo.id)).toHaveLength(8)
  })

  it('sin período hoy pero con el próximo ya pago: sin clases hoy', async () => {
    const c = await newClient([{ fecha: T(2), plan: 'p8' }])
    expect(await checkIn(c.dni)).toMatchObject({
      resultado: 'sin_clases_hoy',
      tiene_periodo_en_espera: true,
    })
    expect(await attendancesOf(c.id)).toHaveLength(0)
  })

  it('pase libre: puede pasar sin registrar asistencia', async () => {
    const c = await newClient([{ fecha: T(-1), plan: 'libre' }])
    expect(await checkIn(c.dni)).toMatchObject({ resultado: 'pase_libre', hasta: T(28) })
    expect(await attendancesOf(c.id)).toHaveLength(0)
  })

  it('DNI inexistente, inválido o de un cliente dado de baja', async () => {
    const baja = await newClient([{ fecha: T(-1), plan: 'p8' }], [], { nombre: 'Beto' })
    await service.from('profiles').update({ activo: false }).eq('id', baja.id)

    expect(await checkIn(randomDni())).toMatchObject({ resultado: 'no_encontrado', nombre: null })
    expect(await checkIn('123')).toMatchObject({ resultado: 'dni_invalido', nombre: null })
    // Dado de baja: no devuelve el nombre ni registra.
    expect(await checkIn(baja.dni)).toEqual({
      resultado: 'inactivo',
      nombre: null,
      clases_restantes: null,
      hasta: null,
      tiene_periodo_en_espera: null,
    })
    expect(await attendancesOf(baja.id)).toHaveLength(0)
  })

  it('solo la ejecuta un kiosco activo', async () => {
    const c = await newClient([{ fecha: T(-1), plan: 'p8' }])
    const otro = await newClient()

    for (const caller of [otro.db, admin.db, inactiveKiosk.db, anonClient()]) {
      const { data, error } = await caller.rpc('kiosk_check_in', { p_dni: c.dni })
      expect(data).toBeNull()
      expect(error).not.toBeNull()
    }
    expect(await attendancesOf(c.id)).toHaveLength(0)
  })
})

describe('el kiosco no lee ningún dato', () => {
  it('ni clientes, pagos, asistencias, estados, planes, ejercicios, rutinas ni fotos', async () => {
    const c = await newClient([{ fecha: T(-1), plan: 'p8' }], [T(-1)])
    expect(c.id).toBeTruthy()

    const profiles = await kiosk.db.from('profiles').select('id')
    expect(profiles.error).toBeNull()
    expect(profiles.data).toEqual([{ id: kiosk.id }]) // solo su propia fila

    const status = await kiosk.db.from('client_status').select('*')
    expect(status.error).toBeNull()
    expect(status.data).toEqual([])

    const tablas = [
      'payments',
      'attendances',
      'plans',
      'exercises',
      'routines',
      'routine_items',
      'routine_completions',
    ] as const
    for (const tabla of tablas) {
      const { data, error } = await kiosk.db.from(tabla).select('*').limit(1)
      expect(error, tabla).toBeNull()
      expect(data, tabla).toEqual([])
    }

    const periods = await kiosk.db.rpc('client_periods', { p_client_id: c.id })
    expect(periods.data ?? []).toEqual([])

    const photo = await kiosk.db.storage.from('exercise-images').download(photoPath)
    expect(photo.error).not.toBeNull()
  })

  it('no puede registrar asistencias directo en la tabla', async () => {
    const c = await newClient([{ fecha: T(-1), plan: 'p8' }])
    const { error } = await kiosk.db.from('attendances').insert({ client_id: c.id, fecha: today })
    expect(error).not.toBeNull()
    expect(await attendancesOf(c.id)).toHaveLength(0)
  })

  it('un cliente activo sigue leyendo planes y ejercicios', async () => {
    const c = await newClient()
    const plansRes = await c.db.from('plans').select('id').eq('id', plans.p8)
    expect(plansRes.data).toEqual([{ id: plans.p8 }])
    const exercises = await c.db.from('exercises').select('id').limit(1)
    expect(exercises.data).toHaveLength(1)
  })
})
