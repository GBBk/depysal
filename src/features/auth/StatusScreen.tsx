import type { ReactNode } from 'react'

/** Pantalla completa con un mensaje (carga, error, cuenta inactiva). */
export function StatusScreen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-lg font-medium">{title}</p>
      {children}
    </main>
  )
}
