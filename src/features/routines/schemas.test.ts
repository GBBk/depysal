import { describe, expect, it } from 'vitest'
import {
  lastDoneByDay,
  nextDay,
  routineDays,
  routineFormSchema,
  toFormItems,
  toSaveItems,
  type RoutineItemValues,
} from './schemas'

const item = (dia: 'A' | 'B', exercise_id: number, extra: Partial<RoutineItemValues> = {}) => ({
  dia,
  exercise_id,
  series: '3',
  reps: '10',
  descanso_seg: '60',
  notas: '',
  ...extra,
})

describe('toSaveItems', () => {
  it('numera el orden dentro de cada día y convierte los números', () => {
    expect(
      toSaveItems([
        item('A', 1),
        item('B', 2, { descanso_seg: '' }),
        item('A', 3, { notas: ' Lento ' }),
      ]),
    ).toEqual([
      { dia: 'A', orden: 0, exercise_id: 1, series: 3, reps: '10', descanso_seg: 60, notas: '' },
      { dia: 'B', orden: 0, exercise_id: 2, series: 3, reps: '10', descanso_seg: null, notas: '' },
      {
        dia: 'A',
        orden: 1,
        exercise_id: 3,
        series: 3,
        reps: '10',
        descanso_seg: 60,
        notas: 'Lento',
      },
    ])
  })
})

describe('toFormItems', () => {
  it('ordena por día y orden, y pasa números a texto', () => {
    expect(
      toFormItems([
        {
          dia: 'B',
          orden: 0,
          exercise_id: 2,
          series: 4,
          reps: '8',
          descanso_seg: null,
          notas: null,
        },
        { dia: 'A', orden: 1, exercise_id: 3, series: 3, reps: '12', descanso_seg: 45, notas: 'x' },
        {
          dia: 'A',
          orden: 0,
          exercise_id: 1,
          series: 3,
          reps: '10',
          descanso_seg: 60,
          notas: null,
        },
      ]).map((i) => [i.dia, i.exercise_id, i.series, i.descanso_seg, i.notas]),
    ).toEqual([
      ['A', 1, '3', '60', ''],
      ['A', 3, '3', '45', 'x'],
      ['B', 2, '4', '', ''],
    ])
  })
})

describe('routineFormSchema', () => {
  it('valida series, repeticiones y descanso', () => {
    const ok = { nombre: 'Rutina', items: [item('A', 1)] }
    expect(routineFormSchema.safeParse(ok).success).toBe(true)
    expect(routineFormSchema.safeParse({ ...ok, nombre: ' ' }).success).toBe(false)
    expect(
      routineFormSchema.safeParse({ ...ok, items: [item('A', 1, { series: '0' })] }).success,
    ).toBe(false)
    expect(
      routineFormSchema.safeParse({ ...ok, items: [item('A', 1, { reps: '' })] }).success,
    ).toBe(false)
    expect(
      routineFormSchema.safeParse({ ...ok, items: [item('A', 1, { descanso_seg: '1m' })] }).success,
    ).toBe(false)
  })
})

describe('días', () => {
  it('junta los días con ítems y los agregados, en orden', () => {
    expect(routineDays([{ dia: 'C' }, { dia: 'A' }, { dia: 'A' }], ['B'])).toEqual(['A', 'B', 'C'])
  })

  it('propone la siguiente letra libre, hasta la F', () => {
    expect(nextDay(['A', 'B'])).toBe('C')
    expect(nextDay(['A', 'C'])).toBe('B')
    expect(nextDay(['A', 'B', 'C', 'D', 'E', 'F'])).toBeNull()
  })

  it('última vez hecho por día', () => {
    expect(
      lastDoneByDay([
        { dia: 'A', fecha: '2026-11-10' },
        { dia: 'A', fecha: '2026-11-17' },
        { dia: 'B', fecha: '2026-11-12' },
      ]),
    ).toEqual({ A: '2026-11-17', B: '2026-11-12' })
  })
})
