import { Dumbbell } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Marca del gimnasio: ícono naranja + "Deporte y Salud". Pensada para fondo negro. */
export function Brand({ className, size = 'md' }: { className?: string; size?: 'md' | 'lg' }) {
  const large = size === 'lg'
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground',
          large ? 'size-12' : 'size-9',
        )}
        aria-hidden
      >
        <Dumbbell className={large ? 'size-7' : 'size-5'} />
      </span>
      <span
        className={cn(
          'font-heading leading-none font-extrabold tracking-tight uppercase',
          large ? 'text-2xl' : 'text-base',
        )}
      >
        Deporte <span className="text-primary">y</span> Salud
      </span>
    </div>
  )
}
