import { useEffect, useState } from 'react'
import { ExercisePhoto } from '@/features/exercises/ExercisePhoto'

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Alterna la posición inicial y la final como una animación simple. Si el sistema pide menos
 * movimiento, muestra las dos fotos una al lado de la otra.
 */
export function PhotoCycle({ urls, alt }: { urls: (string | undefined)[]; alt: string }) {
  const [index, setIndex] = useState(0)
  const [reduced] = useState(prefersReducedMotion)
  const count = urls.length

  useEffect(() => {
    if (reduced || count < 2) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), 1400)
    return () => window.clearInterval(timer)
  }, [reduced, count])

  if (count === 0) return <ExercisePhoto url={undefined} alt={alt} />
  if (reduced && count > 1) {
    return (
      <div className="grid grid-cols-2 gap-1">
        {urls.map((url, i) => (
          <ExercisePhoto key={i} url={url} alt={`${alt} (${i === 0 ? 'inicio' : 'final'})`} />
        ))}
      </div>
    )
  }
  return <ExercisePhoto url={urls[index % count]} alt={alt} />
}
