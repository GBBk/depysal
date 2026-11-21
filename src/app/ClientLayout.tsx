import { Outlet } from 'react-router'
import { SignOutButton } from '@/features/auth/SignOutButton'
import { Brand } from './Brand'

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
      <main className="mx-auto max-w-md p-4">
        <Outlet />
      </main>
    </div>
  )
}
