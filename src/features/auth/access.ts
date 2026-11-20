// Reglas de navegación por rol. Es solo UX: la autorización real la hace el RLS.

export type Area = 'admin' | 'app'

export type ProfileAccess = { rol: string; activo: boolean }

export type Access = 'ok' | 'forbidden' | 'inactive'

/** Sección a la que va cada usuario después de iniciar sesión. */
export function homePath(profile: ProfileAccess): string {
  return profile.rol === 'admin' ? '/admin' : '/app'
}

/** `/admin/*` solo para admin; `/app/*` solo para clientes activos. */
export function canEnter(area: Area, profile: ProfileAccess): Access {
  if (area === 'admin') return profile.rol === 'admin' ? 'ok' : 'forbidden'
  if (profile.rol !== 'client') return 'forbidden'
  return profile.activo ? 'ok' : 'inactive'
}
