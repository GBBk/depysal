import {
  ClipboardList,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { SignOutButton } from '@/features/auth/SignOutButton'
import { cn } from '@/lib/utils'
import { Brand } from './Brand'

type NavItem = { to: string; label: string; icon: LucideIcon; end: boolean }

const links: NavItem[] = [
  { to: '/admin', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/admin/clientes', label: 'Clientes', icon: Users, end: false },
  { to: '/admin/ejercicios', label: 'Ejercicios', icon: Dumbbell, end: false },
  { to: '/admin/rutinas', label: 'Rutinas', icon: ClipboardList, end: false },
  { to: '/admin/planes', label: 'Planes', icon: CreditCard, end: false },
]

/**
 * Escritorio: barra lateral negra. Celular: barra superior negra + pestañas abajo,
 * para que la recepción lo use cómodo desde el teléfono.
 */
export function AdminLayout() {
  return (
    <div className="min-h-svh md:pl-64">
      {/* Barra lateral (escritorio) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="border-b border-sidebar-border px-5 py-5">
          <Brand />
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Principal">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-white before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-primary'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <l.icon className={cn('size-5', isActive && 'text-primary')} />
                  {l.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <SignOutButton
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
          />
        </div>
      </aside>

      {/* Barra superior (celular) */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
        <Brand />
        <SignOutButton
          variant="ghost"
          iconOnly
          className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
        />
      </header>

      <main className="mx-auto w-full max-w-6xl p-4 pb-24 md:p-8 md:pb-8">
        <Outlet />
      </main>

      {/* Pestañas (celular) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Principal"
      >
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 py-2.5 text-xs font-medium',
                isActive ? 'text-primary' : 'text-sidebar-foreground/60',
              )
            }
          >
            <l.icon className="size-5" />
            {l.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
