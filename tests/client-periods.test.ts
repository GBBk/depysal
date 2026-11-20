import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createUser, deleteUsers, randomDni, service, type TestUser } from './helpers'

/** Suma días a una fecha 'YYYY-MM-DD'. */
function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Hoy en Argentina, igual que la vista client_status. */
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires',
}).format(new Date())
const T = (days: number) => addDays(today, days)

type PlanKey = 'p8' | 'libre'
type PaymentSpec = { fecha: string; plan: PlanKey; anulado?: boolean }

const users: TestUser[] = []
const plans: Record<PlanKey, number> = { p8: 0, libre: 0 }

async function scenario(payments: PaymentSpec[], attendances: string[] = []) {
  const user = await createUser('client', { dni: randomDni() })
  users.push(user)
  const paymentIds: number[] = []
  for (const p of payments) {
    const { data, error } = await service
      .from('payments')
      .insert({
        client_id: user.id,
        plan_id: plans[p.plan],
        monto: 1000,
        medio: 'efectivo',
        fecha_pago: p.fecha,
        anulado: p.anulado ?? false,
      })
      .select('id')
      .single()
    if (error) throw error
    paymentIds.push(data.id)
  }
  if (attendances.length > 0) {
    const { error } = await service
      .from('attendances')
      .insert(attendances.map((fecha) => ({ client_id: user.id, fecha })))
    if (error) throw error
  }
  return { user, paymentIds }
}

async function periods(clientId: string) {
  const { data, error } = await service.rpc('client_periods', { p_client_id: clientId })
  if (error) throw error
  return data.map(({ desde, hasta, clases_total, clases_usadas, termino_por_clases }) => ({
    desde,
    hasta,
    clases_total,
    clases_usadas,
    termino_por_clases,
  }))
}

async function status(clientId: string) {
  const { data, error } = await service
    .from('client_status')
    .select('estado, periodo_actual, hasta, clases_restantes, tiene_periodo_en_espera')
    .eq('client_id', clientId)
    .single()
  if (error) throw error
  return data
}

const ochoClases = [
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
  const { data, error } = await service
    .from('plans')
    .insert([
      { nombre: 'Test 8 clases', precio: 1000, clases: 8 },
      { nombre: 'Test pase libre', precio: 1000, clases: null },
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
  await deleteUsers(...users)
})

describe('client_periods', () => {
  it('primer pago: empieza en la fecha de pago y vence a los 30 días', async () => {
    const { user } = await scenario([{ fecha: '2026-03-01', plan: 'p8' }])
    expect(await periods(user.id)).toEqual([
      {
        desde: '2026-03-01',
        hasta: '2026-03-30',
        clases_total: 8,
        clases_usadas: 0,
        termino_por_clases: false,
      },
    ])
  })

  it('pago anticipado: el nuevo período empieza al día siguiente del fin del actual', async () => {
    const { user } = await scenario(
      [
        { fecha: '2026-03-01', plan: 'p8' },
        { fecha: '2026-03-25', plan: 'p8' },
      ],
      ['2026-03-02', '2026-03-05'],
    )
    const [first, second] = await periods(user.id)
    expect(first).toMatchObject({ desde: '2026-03-01', hasta: '2026-03-30', clases_usadas: 2 })
    expect(second).toMatchObject({ desde: '2026-03-31', hasta: '2026-04-29', clases_usadas: 0 })
  })

  it('8 clases que terminan antes de los 30 días, con período en espera', async () => {
    const { user } = await scenario(
      [
        { fecha: '2026-03-01', plan: 'p8' },
        { fecha: '2026-03-05', plan: 'p8' },
      ],
      ochoClases,
    )
    const [first, second] = await periods(user.id)
    expect(first).toEqual({
      desde: '2026-03-01',
      hasta: '2026-03-20',
      clases_total: 8,
      clases_usadas: 8,
      termino_por_clases: true,
    })
    expect(second).toMatchObject({ desde: '2026-03-21', hasta: '2026-04-19' })
  })

  it('8 clases que terminan antes de los 30 días, sin período en espera', async () => {
    const { user } = await scenario(
      [
        { fecha: '2026-03-01', plan: 'p8' },
        { fecha: '2026-03-25', plan: 'p8' },
      ],
      // La del 22 cae cuando estaba vencido: no cuenta en ningún período.
      [...ochoClases, '2026-03-22'],
    )
    const [first, second] = await periods(user.id)
    expect(first).toMatchObject({ hasta: '2026-03-20', termino_por_clases: true })
    expect(second).toMatchObject({ desde: '2026-03-25', hasta: '2026-04-23', clases_usadas: 0 })
  })

  it('pago después de vencido: empieza en la fecha de pago', async () => {
    const { user } = await scenario([
      { fecha: '2026-03-01', plan: 'p8' },
      { fecha: '2026-04-15', plan: 'p8' },
    ])
    const [first, second] = await periods(user.id)
    expect(first).toMatchObject({ hasta: '2026-03-30' })
    expect(second).toMatchObject({ desde: '2026-04-15', hasta: '2026-05-14' })
  })

  it('pase libre: ignora las asistencias y solo termina por fecha', async () => {
    const asistencias = Array.from({ length: 12 }, (_, i) => addDays('2026-03-01', i))
    const { user } = await scenario(
      [
        { fecha: '2026-03-01', plan: 'libre' },
        { fecha: '2026-03-10', plan: 'libre' },
      ],
      asistencias,
    )
    expect(await periods(user.id)).toEqual([
      {
        desde: '2026-03-01',
        hasta: '2026-03-30',
        clases_total: null,
        clases_usadas: null,
        termino_por_clases: false,
      },
      {
        desde: '2026-03-31',
        hasta: '2026-04-29',
        clases_total: null,
        clases_usadas: null,
        termino_por_clases: false,
      },
    ])
  })

  it('un pago anulado no genera período y anularlo recalcula los siguientes', async () => {
    const { user, paymentIds } = await scenario([
      { fecha: '2026-03-01', plan: 'p8' },
      { fecha: '2026-03-05', plan: 'p8' },
    ])
    expect((await periods(user.id))[1]).toMatchObject({ desde: '2026-03-31' })

    await service.from('payments').update({ anulado: true }).eq('id', paymentIds[0])
    expect(await periods(user.id)).toEqual([
      {
        desde: '2026-03-05',
        hasta: '2026-04-03',
        clases_total: 8,
        clases_usadas: 0,
        termino_por_clases: false,
      },
    ])
  })

  it('anular (borrar) una asistencia recalcula el período', async () => {
    const { user } = await scenario(
      [
        { fecha: '2026-03-01', plan: 'p8' },
        { fecha: '2026-03-05', plan: 'p8' },
      ],
      ochoClases,
    )
    expect((await periods(user.id))[1]).toMatchObject({ desde: '2026-03-21' })

    await service.from('attendances').delete().eq('client_id', user.id).eq('fecha', '2026-03-20')
    const [first, second] = await periods(user.id)
    expect(first).toMatchObject({
      hasta: '2026-03-30',
      clases_usadas: 7,
      termino_por_clases: false,
    })
    expect(second).toMatchObject({ desde: '2026-03-31' })
  })

  it('las clases no usadas se pierden a los 30 días', async () => {
    const { user } = await scenario(
      [
        { fecha: '2026-03-01', plan: 'p8' },
        { fecha: '2026-03-31', plan: 'p8' },
      ],
      ['2026-03-02', '2026-03-09', '2026-03-16'],
    )
    const [first, second] = await periods(user.id)
    expect(first).toMatchObject({ hasta: '2026-03-30', clases_usadas: 3 })
    // El nuevo período tiene sus 8 clases, no 8 + las 5 que sobraron.
    expect(second).toMatchObject({ desde: '2026-03-31', clases_total: 8, clases_usadas: 0 })
  })

  it('pagos el mismo día se ordenan por id', async () => {
    const { user, paymentIds } = await scenario([
      { fecha: '2026-03-01', plan: 'p8' },
      { fecha: '2026-03-01', plan: 'libre' },
    ])
    const { data } = await service.rpc('client_periods', { p_client_id: user.id })
    expect(data?.map((p) => [p.payment_id, p.desde])).toEqual([
      [paymentIds[0], '2026-03-01'],
      [paymentIds[1], '2026-03-31'],
    ])
  })
})

describe('client_status', () => {
  it('al_dia: período vigente que no está por vencer', async () => {
    const { user, paymentIds } = await scenario([{ fecha: T(-3), plan: 'p8' }], [T(-2)])
    expect(await status(user.id)).toEqual({
      estado: 'al_dia',
      periodo_actual: paymentIds[0],
      hasta: T(26),
      clases_restantes: 7,
      tiene_periodo_en_espera: false,
    })
  })

  it('por_vencer por fecha: termina en 5 días o menos', async () => {
    const cinco = await scenario([{ fecha: T(-24), plan: 'libre' }]) // hasta = hoy + 5
    const seis = await scenario([{ fecha: T(-23), plan: 'libre' }]) // hasta = hoy + 6
    const hoy = await scenario([{ fecha: T(-29), plan: 'libre' }]) // hasta = hoy
    expect((await status(cinco.user.id)).estado).toBe('por_vencer')
    expect((await status(seis.user.id)).estado).toBe('al_dia')
    expect((await status(hoy.user.id)).estado).toBe('por_vencer')
  })

  it('por_vencer por clases: le quedan 2 clases o menos', async () => {
    const seisUsadas = [-5, -4, -3, -2, -1, 0].map(T)
    const cincoUsadas = [-5, -4, -3, -2, -1].map(T)
    const dos = await scenario([{ fecha: T(-5), plan: 'p8' }], seisUsadas)
    const tres = await scenario([{ fecha: T(-5), plan: 'p8' }], cincoUsadas)
    expect(await status(dos.user.id)).toMatchObject({ estado: 'por_vencer', clases_restantes: 2 })
    expect(await status(tres.user.id)).toMatchObject({ estado: 'al_dia', clases_restantes: 3 })
  })

  it('vencido: sin pagos', async () => {
    const { user } = await scenario([])
    expect(await status(user.id)).toEqual({
      estado: 'vencido',
      periodo_actual: null,
      hasta: null,
      clases_restantes: null,
      tiene_periodo_en_espera: false,
    })
  })

  it('vencido: venció por fecha', async () => {
    const { user } = await scenario([{ fecha: T(-30), plan: 'libre' }]) // hasta = ayer
    expect(await status(user.id)).toMatchObject({ estado: 'vencido', periodo_actual: null })
  })

  it('vencido: usó todas las clases (antes o el mismo día)', async () => {
    const antes = await scenario(
      [{ fecha: T(-10), plan: 'p8' }],
      [-10, -9, -8, -7, -6, -5, -4, -3].map(T),
    )
    const hoy = await scenario(
      [{ fecha: T(-10), plan: 'p8' }],
      [-7, -6, -5, -4, -3, -2, -1, 0].map(T),
    )
    expect(await status(antes.user.id)).toMatchObject({ estado: 'vencido', periodo_actual: null })
    expect(await status(hoy.user.id)).toMatchObject({ estado: 'vencido', clases_restantes: 0 })
  })

  it('al_dia si ya pagó el siguiente, aunque el actual esté por vencer o sin clases', async () => {
    const porVencer = await scenario([
      { fecha: T(-27), plan: 'libre' },
      { fecha: T(-1), plan: 'libre' },
    ])
    const sinClases = await scenario(
      [
        { fecha: T(-10), plan: 'p8' },
        { fecha: T(-9), plan: 'p8' },
      ],
      [-7, -6, -5, -4, -3, -2, -1, 0].map(T),
    )
    expect(await status(porVencer.user.id)).toMatchObject({
      estado: 'al_dia',
      tiene_periodo_en_espera: true,
    })
    expect(await status(sinClases.user.id)).toMatchObject({
      estado: 'al_dia',
      tiene_periodo_en_espera: true,
    })
  })
})

describe('client_periods y client_status: RLS', () => {
  it('un cliente no puede calcular los períodos ni ver el estado de otro', async () => {
    const a = await scenario([{ fecha: T(-3), plan: 'p8' }])
    const b = await scenario([{ fecha: T(-3), plan: 'p8' }])

    const own = await a.user.db.rpc('client_periods', { p_client_id: a.user.id })
    expect(own.data).toHaveLength(1)

    const other = await a.user.db.rpc('client_periods', { p_client_id: b.user.id })
    expect(other.error).toBeNull()
    expect(other.data).toEqual([])

    const { data: rows } = await a.user.db.from('client_status').select('client_id, estado')
    expect(rows).toEqual([{ client_id: a.user.id, estado: 'al_dia' }])
  })
})
