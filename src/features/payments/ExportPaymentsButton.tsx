import { FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatMoney, todayISO } from '@/lib/format'
import { useExportPayments } from './api'
import { paymentsFileName } from './export'

/** Elegir un mes y bajar sus pagos en un .csv para abrir con Excel. */
export function ExportPaymentsButton() {
  const [month, setMonth] = useState(() => todayISO().slice(0, 7))
  const [resultado, setResultado] = useState<string | null>(null)
  const exportar = useExportPayments()

  const onExport = () => {
    setResultado(null)
    exportar.mutate(month, {
      onSuccess: ({ csv, total, validos, anulados }) => {
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
        const link = document.createElement('a')
        link.href = url
        link.download = paymentsFileName(month)
        link.click()
        URL.revokeObjectURL(url)
        setResultado(
          `${validos === 1 ? '1 pago' : `${validos} pagos`} · ${formatMoney(total)}` +
            (anulados > 0 ? ` · ${anulados === 1 ? '1 anulado' : `${anulados} anulados`}` : ''),
        )
      },
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Input
          type="month"
          aria-label="Mes de los pagos a exportar"
          value={month}
          max={todayISO().slice(0, 7)}
          onChange={(e) => setMonth(e.target.value)}
          className="w-48 md:w-44"
        />
        <Button variant="outline" disabled={!month || exportar.isPending} onClick={onExport}>
          <FileSpreadsheet />
          {exportar.isPending ? 'Exportando…' : 'Exportar pagos'}
        </Button>
      </div>
      {exportar.isError && (
        <p role="alert" className="text-right text-xs text-destructive">
          No se pudieron exportar los pagos.
        </p>
      )}
      {resultado && (
        <p role="status" className="text-right text-xs text-muted-foreground">
          {resultado}
        </p>
      )}
    </div>
  )
}
