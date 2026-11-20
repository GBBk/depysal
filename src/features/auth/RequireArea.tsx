import { Navigate, Outlet } from 'react-router'
import { canEnter, homePath, type Area } from './access'
import { useProfile } from './api'
import { useAuth } from './auth-context'
import { SignOutButton } from './SignOutButton'
import { StatusScreen } from './StatusScreen'

/**
 * Protege una sección de rutas según el rol. Sin `area` solo redirige a la sección que
 * corresponde (se usa en `/`).
 */
export function RequireArea({ area }: { area?: Area }) {
  const { session, loading } = useAuth()
  const profile = useProfile()

  if (loading) return <StatusScreen title="Cargando…" />
  if (!session) return <Navigate to="/login" replace />
  if (profile.isPending) return <StatusScreen title="Cargando…" />
  if (profile.isError) {
    return (
      <StatusScreen title="No se pudo cargar tu cuenta. Probá de nuevo más tarde.">
        <SignOutButton />
      </StatusScreen>
    )
  }

  if (!area) return <Navigate to={homePath(profile.data)} replace />

  const access = canEnter(area, profile.data)
  if (access === 'forbidden') return <Navigate to={homePath(profile.data)} replace />
  if (access === 'inactive') {
    return (
      <StatusScreen title="Tu cuenta está inactiva">
        <p className="text-sm text-muted-foreground">
          Contactate con el gimnasio para reactivarla.
        </p>
        <SignOutButton />
      </StatusScreen>
    )
  }
  return <Outlet />
}
