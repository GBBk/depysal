import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { service } from './helpers'

// T13: la biblioteca curada quedó cargada (npm run db:reset) con sus fotos en Storage.

type LibraryEntry = {
  id: string
  nombre: string
  grupo: string
  equipo: string
  instrucciones: string
}

const library: LibraryEntry[] = JSON.parse(
  readFileSync(new URL('../scripts/exercise-library.json', import.meta.url), 'utf8'),
)

describe('biblioteca de ejercicios', () => {
  it('cada ejercicio de la lista curada está cargado, en español y con 2 fotos', async () => {
    const { data, error } = await service
      .from('exercises')
      .select('origen_id, nombre, grupo_muscular, equipo, instrucciones, imagenes')
      .eq('origen', 'importado')
    expect(error).toBeNull()

    const byId = new Map(data?.map((e) => [e.origen_id, e]))
    for (const entry of library) {
      const row = byId.get(entry.id)
      expect(row, entry.id).toBeDefined()
      expect(row).toMatchObject({
        nombre: entry.nombre,
        grupo_muscular: entry.grupo,
        equipo: entry.equipo,
        instrucciones: entry.instrucciones,
        imagenes: [`importados/${entry.id}/0.jpg`, `importados/${entry.id}/1.jpg`],
      })
    }
  })

  it('todas las fotos existen en el bucket exercise-images', async () => {
    const paths = library.flatMap((e) => [`importados/${e.id}/0.jpg`, `importados/${e.id}/1.jpg`])
    const { data, error } = await service.storage
      .from('exercise-images')
      .createSignedUrls(paths, 60)
    expect(error).toBeNull()
    const missing = data?.filter((d) => d.error).map((d) => d.path)
    expect(missing).toEqual([])
  })

  it('origen_id es único: reimportar no puede duplicar un ejercicio', async () => {
    const first = library[0]
    const { error } = await service.from('exercises').insert({
      nombre: first.nombre,
      grupo_muscular: first.grupo,
      equipo: first.equipo,
      origen: 'importado',
      origen_id: first.id,
    })
    expect(error?.code).toBe('23505')
  })
})
