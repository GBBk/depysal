import { NavLink, Outlet } from 'react-router'
import { cn } from '@/lib/utils'
import { SignOutButton } from '@/features/auth/SignOutButton'

const links = [
  { to: '/admin', label: 'Panel', end: true },
  { to: '/admin/clientes', label: 'Clientes', end: false },
  { to: '/admin/planes', label: 'Planes', end: false },
]

export function AdminLayout() {
  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="font-semibold">Depysal</span>
          <nav className="flex gap-3 text-sm">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn('hover:text-foreground', isActive ? 'font-medium' : 'text-muted-foreground')
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <SignOutButton variant="ghost" />
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  )
}
