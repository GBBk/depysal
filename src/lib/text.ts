/** Minúsculas y sin tildes, para buscar sin importar cómo se escriba. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/** Palabras de una búsqueda, normalizadas. */
export function searchWords(query: string): string[] {
  return normalizeText(query).split(/\s+/).filter(Boolean)
}
