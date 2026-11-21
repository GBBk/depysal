import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate, formatMoney } from '@/lib/format'
import { useAnnulPayment, useClientPayments, type PaymentRow } from './api'
import { medioLabel } from './schemas'

export function PaymentsHistory({ clientId }: { clientId: string }) {
  const payments = useClientPayments(clientId)
  const annul = useAnnulPayment(clientId)

  const onAnnul = (p: PaymentRow) => {
    const message = `¿Anular el pago del ${formatDate(p.fecha_pago)} por ${formatMoney(p.monto)}? Los períodos se recalculan.`
    if (window.confirm(message)) annul.mutate(p.id)
  }

  if (payments.isPending) return <p className="text-sm text-muted-foreground">Cargando…</p>
  if (payments.isError) {
    return <p className="text-sm text-destructive">No se pudieron cargar los pagos.</p>
  }
  if (payments.data.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay pagos.</p>
  }

  return (
    <>
      {annul.isError && (
        <p role="alert" className="text-sm text-destructive">
          No se pudo anular el pago. Probá de nuevo.
        </p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="hidden sm:table-cell">Medio</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.data.map((p) => (
            <TableRow key={p.id} className={p.anulado ? 'text-muted-foreground' : undefined}>
              <TableCell>{formatDate(p.fecha_pago)}</TableCell>
              <TableCell>{p.plans.nombre}</TableCell>
              <TableCell className={p.anulado ? 'text-right line-through' : 'text-right'}>
                {formatMoney(p.monto)}
              </TableCell>
              <TableCell className="hidden sm:table-cell">{medioLabel(p.medio)}</TableCell>
              <TableCell className="text-right">
                {p.anulado ? (
                  <Badge variant="secondary">Anulado</Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={annul.isPending}
                    onClick={() => onAnnul(p)}
                  >
                    Anular
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
