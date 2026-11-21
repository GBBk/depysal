// Arma la biblioteca de ejercicios (T13) a partir de scripts/exercise-library.json:
//   1. Valida la lista curada contra free-exercise-db (dominio público, Unlicense).
//   2. Descarga las 2 fotos de cada ejercicio a supabase/exercise-images/importados/<id>/
//      (carpeta ignorada por git; si una foto ya está, no la vuelve a bajar).
//   3. Genera supabase/seeds/exercises.sql, idempotente: `on conflict (origen_id) do nothing`,
//      así correrlo de nuevo no duplica nada ni pisa lo que el admin haya editado.
//
// Uso: npm run exercises:build   (las fotos se suben con npm run exercises:upload)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main'
const IMAGES_DIR = join(root, 'supabase', 'exercise-images', 'importados')
const SQL_FILE = join(root, 'supabase', 'seeds', 'exercises.sql')

// Mismas listas que los CHECK de la migración 20261124000000_exercises_routines.sql.
const GRUPOS = new Set([
  'Pecho',
  'Espalda',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Antebrazos',
  'Cuádriceps',
  'Isquiotibiales',
  'Glúteos',
  'Pantorrillas',
  'Abdominales',
  'Cuerpo completo',
])
const EQUIPOS = new Set(['Barra', 'Mancuernas', 'Máquina', 'Polea', 'Peso corporal', 'Otro'])

const library = JSON.parse(readFileSync(join(root, 'scripts', 'exercise-library.json'), 'utf8'))

async function fetchOk(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} al bajar ${url}`)
  return res
}

// 1. Validación -------------------------------------------------------------------------------
const errors = []
const seen = new Set()
for (const e of library) {
  if (seen.has(e.id)) errors.push(`${e.id}: repetido`)
  seen.add(e.id)
  if (!e.nombre?.trim()) errors.push(`${e.id}: sin nombre`)
  if (!GRUPOS.has(e.grupo)) errors.push(`${e.id}: grupo inválido "${e.grupo}"`)
  if (!EQUIPOS.has(e.equipo)) errors.push(`${e.id}: equipo inválido "${e.equipo}"`)
  if (!e.instrucciones?.trim()) errors.push(`${e.id}: sin instrucciones`)
}

const source = await (await fetchOk(`${SOURCE}/dist/exercises.json`)).json()
const byId = new Map(source.map((e) => [e.id, e]))
for (const e of library) {
  const original = byId.get(e.id)
  if (!original) errors.push(`${e.id}: no existe en free-exercise-db`)
  else if (original.images.length !== 2) errors.push(`${e.id}: no tiene 2 fotos`)
}
if (errors.length > 0) {
  console.error(`La biblioteca tiene ${errors.length} errores:\n- ${errors.join('\n- ')}`)
  process.exit(1)
}

// 2. Fotos ------------------------------------------------------------------------------------
let downloaded = 0
for (const e of library) {
  const dir = join(IMAGES_DIR, e.id)
  mkdirSync(dir, { recursive: true })
  for (const [i, path] of byId.get(e.id).images.entries()) {
    const file = join(dir, `${i}.jpg`)
    if (existsSync(file)) continue
    const res = await fetchOk(`${SOURCE}/exercises/${path}`)
    writeFileSync(file, Buffer.from(await res.arrayBuffer()))
    downloaded++
  }
}

// 3. SQL --------------------------------------------------------------------------------------
const q = (s) => `'${String(s).replaceAll("'", "''")}'`
const rows = library.map((e) => {
  const imagenes = [0, 1].map((i) => `importados/${e.id}/${i}.jpg`)
  return `  (${[
    q(e.nombre),
    q(e.grupo),
    q(e.equipo),
    q(e.instrucciones),
    `array[${imagenes.map(q).join(', ')}]`,
    q('importado'),
    q(e.id),
  ].join(', ')})`
})

const sql = `-- Biblioteca inicial de ejercicios (SPEC §2.7), traducida al español desde
-- free-exercise-db (https://github.com/yuhonas/free-exercise-db, Unlicense).
-- GENERADO por scripts/build-exercise-library.mjs a partir de scripts/exercise-library.json:
-- no se edita a mano. Idempotente: no duplica ni pisa ejercicios ya cargados.
-- Las fotos se suben aparte al bucket exercise-images (npm run exercises:upload).

insert into public.exercises
  (nombre, grupo_muscular, equipo, instrucciones, imagenes, origen, origen_id)
values
${rows.join(',\n')}
on conflict (origen_id) do nothing;
`
mkdirSync(dirname(SQL_FILE), { recursive: true })
writeFileSync(SQL_FILE, sql)

const porGrupo = {}
for (const e of library) porGrupo[e.grupo] = (porGrupo[e.grupo] ?? 0) + 1
console.log(
  `${library.length} ejercicios OK; ${downloaded} fotos descargadas (el resto ya estaban).`,
)
console.log(
  Object.entries(porGrupo)
    .map(([g, n]) => `${g}: ${n}`)
    .join(' · '),
)
console.log(`SQL: ${SQL_FILE}`)
