import { describe, expect, it } from 'vitest'
import { exerciseSchema, photoError, photoPath, toExerciseRow } from './schemas'
import { filterExercises } from './search'

const valid = {
  nombre: 'Press de banca con barra',
  grupo_muscular: 'Pecho',
  equipo: 'Barra',
  instrucciones: 'Acostate en el banco.',
  video_url: '',
}

describe('exerciseSchema', () => {
  it('acepta un ejercicio válido y deja el video vacío como null', () => {
    expect(toExerciseRow(exerciseSchema.parse(valid))).toEqual({
      nombre: 'Press de banca con barra',
      grupo_muscular: 'Pecho',
      equipo: 'Barra',
      instrucciones: 'Acostate en el banco.',
      video_url: null,
    })
  })

  it('exige nombre, grupo y equipo de la lista, y un link válido', () => {
    expect(exerciseSchema.safeParse({ ...valid, nombre: ' ' }).success).toBe(false)
    expect(exerciseSchema.safeParse({ ...valid, grupo_muscular: 'Piernas' }).success).toBe(false)
    expect(exerciseSchema.safeParse({ ...valid, equipo: 'Kettlebell' }).success).toBe(false)
    expect(exerciseSchema.safeParse({ ...valid, video_url: 'youtube' }).success).toBe(false)
    expect(exerciseSchema.safeParse({ ...valid, video_url: 'https://youtu.be/abc' }).success).toBe(
      true,
    )
  })
})

describe('fotos', () => {
  it('valida tipo y tamaño', () => {
    expect(photoError({ type: 'image/jpeg', size: 500_000 })).toBeNull()
    expect(photoError({ type: 'image/gif', size: 500_000 })).toMatch(/JPG, PNG o WEBP/)
    expect(photoError({ type: 'image/png', size: 3 * 1024 * 1024 })).toMatch(/2 MB/)
  })

  it('arma la ruta en propios/<id>/ con el slot y la extensión', () => {
    expect(photoPath(7, 1, 'Foto Final.PNG', 123)).toBe('propios/7/1-123.png')
  })
})

describe('filterExercises', () => {
  const list = [
    { nombre: 'Press de banca con barra', grupo_muscular: 'Pecho', equipo: 'Barra' },
    { nombre: 'Aperturas en máquina', grupo_muscular: 'Pecho', equipo: 'Máquina' },
    { nombre: 'Jalón al pecho', grupo_muscular: 'Espalda', equipo: 'Polea' },
  ]
  const names = (filters: { query?: string; grupo?: string; equipo?: string }) =>
    filterExercises(list, { query: '', grupo: '', equipo: '', ...filters }).map((e) => e.nombre)

  it('busca por nombre sin importar tildes', () => {
    expect(names({ query: 'maquina' })).toEqual(['Aperturas en máquina'])
    expect(names({ query: 'jalon pecho' })).toEqual(['Jalón al pecho'])
  })

  it('filtra por grupo y por equipo', () => {
    expect(names({ grupo: 'Pecho' })).toHaveLength(2)
    expect(names({ grupo: 'Pecho', equipo: 'Barra' })).toEqual(['Press de banca con barra'])
  })
})
