import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createUser, deleteUsers, randomDni, service, type TestUser } from './helpers'

describe('plans, payments y attendances: RLS y restricciones', () => {
  let admin: TestUser
  let clientA: TestUser
  let clientB: TestUser
  let inactive: TestUser
  let planId: number

  async function insertPayment(clientId: string, fecha = '2026-11-01') {
    const { data, error } = await service
      .from('payments')
      .insert({
        client_id: clientId,
        plan_id: planId,
        monto: 1000,
        medio: 'efectivo',
        fecha_pago: fecha,
      })
      .select('id')
      .single()
    if (error) throw error
    return data.id
  }

  async function insertAttendance(clientId: string, fecha: string) {
    const { error } = await service.from('attendances').insert({ client_id: clientId, fecha })
    if (error) throw error
  }

  beforeAll(async () => {
    admin = await createUser('admin')
    clientA = await createUser('client', { dni: randomDni() })
    clientB = await createUser('client', { dni: randomDni() })
    inactive = await createUser('client', { dni: randomDni() })
    await service.from('profiles').update({ activo: false }).eq('id', inactive.id)

    const { data, error } = await service
      .from('plans')
      .insert({ nombre: 'Plan de test', precio: 1000, clases: 8 })
      .select('id')
      .single()
    if (error) throw error
    planId = data.id

    for (const c of [clientA, clientB, inactive]) {
      await insertPayment(c.id)
      await insertAttendance(c.id, '2026-11-02')
    }
  })

  afterAll(async () => {
    const ids = [admin, clientA, clientB, inactive].map((u) => u.id)
    await service.from('attendances').delete().in('client_id', ids)
    await service.from('payments').delete().in('client_id', ids)
    await service.from('plans').delete().eq('id', planId)
    await deleteUsers(admin, clientA, clientB, inactive)
  })

  describe('payments', () => {
    it('un cliente ve sus pagos y no los de otro', async () => {
      const { data } = await clientA.db.from('payments').select('client_id')
      expect(data).toEqual([{ client_id: clientA.id }])

      const { data: other } = await clientA.db
        .from('payments')
        .select('id')
        .eq('client_id', clientB.id)
      expect(other).toEqual([])
    })

    it('un cliente no puede cargar ni modificar pagos', async () => {
      const { error } = await clientA.db.from('payments').insert({
        client_id: clientA.id,
        plan_id: planId,
        monto: 1,
        medio: 'efectivo',
        fecha_pago: '2026-11-05',
      })
      expect(error).not.toBeNull()

      const { data } = await clientA.db
        .from('payments')
        .update({ anulado: true })
        .eq('client_id', clientA.id)
        .select()
      expect(data).toEqual([])
    })

    it('un cliente inactivo no ve ni sus propios pagos', async () => {
      const { data } = await inactive.db.from('payments').select('id')
      expect(data).toEqual([])
    })

    it('el admin carga y anula pagos; nadie los borra', async () => {
      const { data, error } = await admin.db
        .from('payments')
        .insert({
          client_id: clientA.id,
          plan_id: planId,
          monto: 1000,
          medio: 'transferencia',
          fecha_pago: '2026-11-10',
        })
        .select('id')
        .single()
      expect(error).toBeNull()
      const id = data?.id ?? -1

      const { data: anulado } = await admin.db
        .from('payments')
        .update({ anulado: true })
        .eq('id', id)
        .select('anulado')
      expect(anulado).toEqual([{ anulado: true }])

      const { data: deleted } = await admin.db.from('payments').delete().eq('id', id).select()
      expect(deleted).toEqual([])
    })

    it('payments.clases copia las clases del plan aunque se mande otro valor', async () => {
      const { data } = await admin.db
        .from('payments')
        .insert({
          client_id: clientB.id,
          plan_id: planId,
          monto: 1000,
          medio: 'efectivo',
          fecha_pago: '2026-11-11',
          clases: 999,
        })
        .select('clases')
        .single()
      expect(data?.clases).toBe(8)
    })

    it('rechaza un medio de pago inválido', async () => {
      const { error } = await admin.db.from('payments').insert({
        client_id: clientA.id,
        plan_id: planId,
        monto: 1000,
        medio: 'bitcoin',
        fecha_pago: '2026-11-12',
      })
      expect(error?.code).toBe('23514')
    })
  })

  describe('attendances', () => {
    it('un cliente ve sus asistencias y no las de otro', async () => {
      const { data } = await clientA.db.from('attendances').select('client_id')
      expect(data).toEqual([{ client_id: clientA.id }])

      const { data: other } = await clientA.db
        .from('attendances')
        .select('id')
        .eq('client_id', clientB.id)
      expect(other).toEqual([])
    })

    it('un cliente no puede registrar ni borrar asistencias', async () => {
      const { error } = await clientA.db
        .from('attendances')
        .insert({ client_id: clientA.id, fecha: '2026-11-03' })
      expect(error).not.toBeNull()

      const { data } = await clientA.db
        .from('attendances')
        .delete()
        .eq('client_id', clientA.id)
        .select()
      expect(data).toEqual([])
    })

    it('un cliente inactivo no ve ni sus propias asistencias', async () => {
      const { data } = await inactive.db.from('attendances').select('id')
      expect(data).toEqual([])
    })

    it('una asistencia como máximo por cliente y por día', async () => {
      const { error } = await admin.db
        .from('attendances')
        .insert({ client_id: clientA.id, fecha: '2026-11-02' })
      expect(error?.code).toBe('23505')
    })

    it('el admin registra (con created_by) y anula asistencias', async () => {
      const { data, error } = await admin.db
        .from('attendances')
        .insert({ client_id: clientB.id, fecha: '2026-11-04' })
        .select('id, created_by')
        .single()
      expect(error).toBeNull()
      expect(data?.created_by).toBe(admin.id)

      const { data: deleted } = await admin.db
        .from('attendances')
        .delete()
        .eq('id', data?.id ?? -1)
        .select('id')
      expect(deleted).toHaveLength(1)
    })
  })

  describe('plans', () => {
    it('un cliente ve los planes pero no los modifica', async () => {
      const { data } = await clientA.db.from('plans').select('id').eq('id', planId)
      expect(data).toHaveLength(1)

      const { data: updated } = await clientA.db
        .from('plans')
        .update({ precio: 1 })
        .eq('id', planId)
        .select()
      expect(updated).toEqual([])
    })

    it('el admin edita planes', async () => {
      const { data } = await admin.db
        .from('plans')
        .update({ precio: 1500 })
        .eq('id', planId)
        .select('precio')
      expect(data).toEqual([{ precio: 1500 }])
    })

    it('un plan con pagos asociados no se borra', async () => {
      const { error } = await admin.db.from('plans').delete().eq('id', planId)
      expect(error?.code).toBe('23503')
    })

    it('rechaza clases <= 0', async () => {
      const { error } = await admin.db
        .from('plans')
        .insert({ nombre: 'Malo', precio: 1, clases: 0 })
      expect(error?.code).toBe('23514')
    })
  })
})
