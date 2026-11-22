import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Foto de un ejercicio (4:3) o un recuadro gris si no tiene. */
export function ExercisePhoto({
  url,
  alt,
  className,
}: {
  url: string | undefined
  alt: string
  className?: string
}) {
  return (
    <div className={cn('aspect-[4/3] overflow-hidden rounded-lg bg-muted', className)}>
      {url ? (
        <img src={url} alt={alt} loading="lazy" className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <ImageOff className="size-8" aria-hidden />
          <span className="sr-only">Sin foto</span>
        </div>
      )}
    </div>
  )
}
