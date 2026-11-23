import { Download } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { buildContactsVcf, type ContactClient } from './contacts'

/** Baja un .vcf con los clientes activos para armar una lista de difusión en WhatsApp. */
export function ExportContactsButton({ clients }: { clients: ContactClient[] | undefined }) {
  const [resultado, setResultado] = useState<string | null>(null)

  const exportar = () => {
    if (!clients) return
    const { vcf, incluidos, omitidos } = buildContactsVcf(clients)
    if (incluidos === 0) {
      setResultado('No hay clientes activos con teléfono válido.')
      return
    }
    const url = URL.createObjectURL(new Blob([vcf], { type: 'text/vcard;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'contactos-deporte-y-salud.vcf'
    link.click()
    URL.revokeObjectURL(url)
    setResultado(
      `${incluidos === 1 ? '1 contacto exportado' : `${incluidos} contactos exportados`}` +
        (omitidos > 0
          ? ` · ${omitidos === 1 ? '1 cliente quedó afuera' : `${omitidos} clientes quedaron afuera`} por no tener un teléfono válido`
          : ''),
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" disabled={!clients} onClick={exportar}>
        <Download />
        Exportar contactos
      </Button>
      {resultado && (
        <p role="status" className="text-right text-xs text-muted-foreground">
          {resultado}
        </p>
      )}
    </div>
  )
}
