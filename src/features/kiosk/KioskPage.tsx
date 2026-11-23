import { CircleAlert, CircleCheck, CircleX, IdCard, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Brand } from '@/app/Brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SignOutButton } from '@/features/auth/SignOutButton'
import { cn } from '@/lib/utils'
import { useKioskCheckIn } from './api'
import { describeKioskResult, type KioskMessage } from './result'

/** Segundos que queda el resultado en pantalla (después se borra para el que sigue). */
const RESULT_SECONDS = 8

/** Tablet de recepción: el cliente escribe su DNI y aprieta Enter. */
export function KioskPage() {
  const [dni, setDni] = useState('')
  const [attempt, setAttempt] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const checkIn = useKioskCheckIn()
  const { reset } = checkIn
  const showing = checkIn.isSuccess || checkIn.isError

  // El resultado (con el nombre) no queda a la vista del próximo que llega.
  useEffect(() => {
    if (!showing) return
    const timer = setTimeout(() => {
      reset()
      setDni('')
    }, RESULT_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [showing, attempt, reset])

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    inputRef.current?.focus()
    if (checkIn.isPending || !dni.trim()) return
    setAttempt((n) => n + 1)
    checkIn.mutate(dni, {
      // Si el DNI estaba mal escrito se deja para corregirlo; si no, queda listo para el próximo.
      onSuccess: (r) => {
        if (r.resultado !== 'dni_invalido' && r.resultado !== 'no_encontrado') setDni('')
      },
    })
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Brand />
          <SignOutButton
            variant="ghost"
            iconOnly
            className="text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-white"
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 pt-10 sm:pt-16">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
            ¡Hola! Anotá tu asistencia
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Escribí tu DNI y apretá <span className="font-semibold">Enter</span>.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <IdCard
              className="pointer-events-none absolute top-1/2 left-4 size-7 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              ref={inputRef}
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              placeholder="Tu DNI"
              aria-label="Tu DNI"
              className="h-16 bg-card pl-14 text-3xl tracking-wider md:text-3xl"
            />
          </div>
          <Button
            type="submit"
            disabled={checkIn.isPending || !dni.trim()}
            className="h-16 px-10 text-lg"
          >
            {checkIn.isPending ? 'Anotando…' : 'Anotarme'}
          </Button>
        </form>

        <div aria-live="polite" aria-atomic>
          {checkIn.isError && (
            <ResultBox
              key={attempt}
              message={{
                tone: 'error',
                title: 'No se pudo registrar',
                detail: 'Probá de nuevo o acercate a recepción.',
              }}
            />
          )}
          {checkIn.data && (
            <ResultBox
              key={attempt}
              nombre={checkIn.data.nombre}
              message={describeKioskResult(checkIn.data)}
            />
          )}
        </div>
      </main>
    </div>
  )
}

const tones: Record<KioskMessage['tone'], { box: string; icon: LucideIcon; iconColor: string }> = {
  ok: {
    box: 'border-emerald-300 bg-emerald-50 text-emerald-950',
    icon: CircleCheck,
    iconColor: 'text-emerald-600',
  },
  warn: {
    box: 'border-amber-300 bg-amber-50 text-amber-950',
    icon: CircleAlert,
    iconColor: 'text-amber-600',
  },
  error: {
    box: 'border-red-300 bg-red-50 text-red-950',
    icon: CircleX,
    iconColor: 'text-red-600',
  },
}

function ResultBox({ message, nombre }: { message: KioskMessage; nombre?: string | null }) {
  const tone = tones[message.tone]
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-4 rounded-2xl border-2 p-6 text-center duration-200 animate-in fade-in zoom-in-95 motion-reduce:animate-none sm:flex-row sm:text-left',
        tone.box,
      )}
    >
      <tone.icon className={cn('size-16 shrink-0', tone.iconColor)} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {nombre && <p className="text-xl font-semibold">Hola, {nombre}</p>}
        <p className="font-heading text-3xl font-bold">{message.title}</p>
        <p className="text-lg">{message.detail}</p>
      </div>
    </div>
  )
}
