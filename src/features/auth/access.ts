// Reglas de navegación por rol. Es solo UX: la autorización real la hace el RLS.

export type Area = 'admin' | 'app' | 'kiosk'

export type ProfileAccess = { rol: string; activo: boolean }

export type Access = 'ok' | 'forbidden' | 'inactive'

/** Sección a la que va cada usuario después de iniciar sesión. */
export function homePath(profile: ProfileAccess): string {
  if (profile.rol === 'admin') return '/admin'
  if (profile.rol === 'kiosk') return '/kiosco'
  return '/app'
}

const areaRol: Record<Area, string> = { admin: 'admin', app: 'client', kiosk: 'kiosk' }

/** `/admin/*` solo para admin; `/app/*` solo para clientes activos; `/kiosco` solo para un kiosco activo. */
export function canEnter(area: Area, profile: ProfileAccess): Access {
  if (profile.rol !== areaRol[area]) return 'forbidden'
  // Como antes: un admin inactivo entra, pero la base ya no lo trata como admin (is_admin).
  if (area === 'admin') return 'ok'
  return profile.activo ? 'ok' : 'inactive'
}
