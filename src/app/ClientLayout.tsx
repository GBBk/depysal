import { ClipboardList, House, UserRound, type LucideIcon } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { SignOutButton } from '@/features/auth/SignOutButton'
import { cn } from '@/lib/utils'
import { Brand } from './Brand'

type Tab = { to: string; label: string; icon: LucideIcon; end: boolean }

const tabs: Tab[] = [
  { to: '/app', label: 'Inicio', icon: House, end: true },
  { to: '/app/rutina', label: 'Mi rutina', icon: ClipboardList, end: false },
  { to: '/app/cuenta', label: 'Cuenta', icon: UserRound, end: false },
]

/** Vista del cliente: pensada para el celular (barra arriba y pestañas abajo). */
export function ClientLayout() {
  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-30 bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <Brand />
          <SignOutButton
            variant="ghost"
            iconOnly
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
          />
        </div>
      </header>
      <main className="mx-auto max-w-md p-4 pb-24">
        <Outlet />
      </main>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)]"
        aria-label="Principal"
      >
        <div className="mx-auto grid max-w-md grid-cols-3">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2.5 text-xs font-medium',
                  isActive ? 'text-primary' : 'text-sidebar-foreground/60',
                )
              }
            >
              <t.icon className="size-5" />
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
