import { cn } from '@/lib/utils'

/** Círculo con las iniciales del cliente. */
export function ClientAvatar({
  nombre,
  apellido,
  size = 'sm',
}: {
  nombre: string
  apellido: string
  size?: 'sm' | 'lg'
}) {
  const initials = `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-sidebar font-semibold text-primary',
        size === 'lg' ? 'size-14 text-lg' : 'size-8 text-xs',
      )}
    >
      {initials}
    </span>
  )
}
