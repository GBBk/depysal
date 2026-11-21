import type { Availability } from './availability'

/** Clases restantes o el aviso que corresponde ("Debe abonar", pase libre…). */
export function AvailabilityNote({ availability }: { availability: Availability }) {
  switch (availability.kind) {
    case 'ok':
      return (
        <span className="text-sm">
          {availability.restantes === 1
            ? 'Queda 1 clase'
            : `Quedan ${availability.restantes} clases`}
        </span>
      )
    case 'debe_abonar':
      return <span className="text-sm font-medium text-destructive">Debe abonar</span>
    case 'sin_clases_hoy':
      return (
        <span className="text-sm text-muted-foreground">
          Sin clases hoy: su próximo período ya está pago
        </span>
      )
    case 'pase_libre':
      return (
        <span className="text-sm text-muted-foreground">Pase libre: no registra asistencias</span>
      )
  }
}
