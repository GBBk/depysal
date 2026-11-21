import type { ReactNode } from 'react'
import { Brand } from '@/app/Brand'

/** Pantalla completa con un mensaje (carga, error, cuenta inactiva). */
export function StatusScreen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-sidebar p-6 text-center text-sidebar-foreground">
      <Brand size="lg" />
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-xl bg-card p-6 text-card-foreground">
        <p className="text-lg font-medium">{title}</p>
        {children}
      </div>
    </main>
  )
}
