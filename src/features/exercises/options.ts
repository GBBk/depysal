// Mismas listas que los CHECK de exercises (migración 20261124000000) y que
// scripts/build-exercise-library.mjs: si cambia una, cambiá las tres.

export const GRUPOS = [
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
] as const

export const EQUIPOS = ['Barra', 'Mancuernas', 'Máquina', 'Polea', 'Peso corporal', 'Otro'] as const

export type Grupo = (typeof GRUPOS)[number]
export type Equipo = (typeof EQUIPOS)[number]

export const PHOTO_LABELS = ['Posición inicial', 'Posición final'] as const

export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024 // mismo límite que el bucket
