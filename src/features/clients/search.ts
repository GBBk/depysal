type Searchable = { nombre: string; apellido: string; dni: string | null; activo: boolean }

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/** Filtra por nombre, apellido o DNI (sin importar tildes ni mayúsculas). */
export function filterClients<T extends Searchable>(
  clients: T[],
  query: string,
  showInactive: boolean,
): T[] {
  const words = normalize(query).replace(/\./g, '').split(/\s+/).filter(Boolean)
  return clients.filter((c) => {
    if (!showInactive && !c.activo) return false
    const haystack = normalize(`${c.nombre} ${c.apellido} ${c.dni ?? ''}`)
    return words.every((w) => haystack.includes(w))
  })
}
