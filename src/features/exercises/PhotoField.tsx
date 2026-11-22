import { ImagePlus, X } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PhotoSlot } from './api'
import { ExercisePhoto } from './ExercisePhoto'
import { PHOTO_TYPES } from './options'
import { photoError } from './schemas'

/** URL temporal para previsualizar un archivo elegido (se libera al cambiarlo). */
function useObjectUrl(file: File | undefined) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : undefined), [file])
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url])
  return url
}

export function PhotoField({
  label,
  slot,
  savedUrl,
  onChange,
}: {
  label: string
  slot: PhotoSlot
  /** URL firmada de la foto guardada (cuando slot es 'keep'). */
  savedUrl: string | undefined
  onChange: (slot: PhotoSlot) => void
}) {
  const inputId = useId()
  const [error, setError] = useState<string | null>(null)
  const previewUrl = useObjectUrl(slot.kind === 'new' ? slot.file : undefined)
  const url = slot.kind === 'new' ? previewUrl : slot.kind === 'keep' ? savedUrl : undefined

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <ExercisePhoto url={url} alt={label} />
      <div className="flex flex-wrap gap-2">
        <label
          htmlFor={inputId}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'cursor-pointer gap-1.5',
          )}
        >
          <ImagePlus />
          {slot.kind === 'none' ? 'Subir foto' : 'Cambiar'}
        </label>
        <input
          id={inputId}
          type="file"
          accept={PHOTO_TYPES.join(',')}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = '' // permite volver a elegir el mismo archivo
            if (!file) return
            const problem = photoError(file)
            setError(problem)
            if (!problem) onChange({ kind: 'new', file })
          }}
        />
        {slot.kind !== 'none' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setError(null)
              onChange({ kind: 'none' })
            }}
          >
            <X />
            Quitar
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
