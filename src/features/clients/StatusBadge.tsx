import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { estadoLabels, isEstado, type Estado } from './estado'

const estadoClasses: Record<Estado, string> = {
  al_dia: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  por_vencer: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  vencido: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
}

export function StatusBadge({ estado }: { estado: string | null | undefined }) {
  if (!isEstado(estado)) return null
  return (
    <Badge className={cn('border-transparent', estadoClasses[estado])}>
      {estadoLabels[estado]}
    </Badge>
  )
}
