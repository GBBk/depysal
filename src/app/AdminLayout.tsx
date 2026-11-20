import { Outlet } from 'react-router'
import { SignOutButton } from '@/features/auth/SignOutButton'

export function AdminLayout() {
  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold">Depysal · Admin</span>
        <SignOutButton variant="ghost" />
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  )
}
