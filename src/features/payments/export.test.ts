import { describe, expect, it } from 'vitest'
import {
  buildPaymentsCsv,
  csvField,
  monthBounds,
  paymentsFileName,
  type ExportPayment,
} from './export'

const pago = (over: Partial<ExportPayment> = {}): ExportPayment => ({
  id: 1,
  fecha_pago: '2026-11-03',
  monto: 32000,
  medio: 'efectivo',
  anulado: false,
  clases: 8,
  plans: { nombre: '2 días por semana' },
  profiles: { nombre: 'Ana', apellido: 'Pérez', dni: '30123456' },
  ...over,
})

describe('buildPaymentsCsv', () => {
  it('arma el archivo para Excel: BOM, ";", coma decimal, fechas dd/mm/aaaa y total', () => {
    const { csv, total, validos, anulados } = buildPaymentsCsv([
      pago(),
      pago({
        id: 2,
        fecha_pago: '2026-11-15',
        monto: 45000.5,
        medio: 'transferencia',
        clases: null,
        plans: { nombre: 'Pase libre' },
        profiles: { nombre: 'Beto', apellido: 'Gómez', dni: null },
      }),
    ])
    expect(csv.charCodeAt(0)).toBe(0xfeff) // BOM UTF-8
    expect(csv.slice(1).split('\r\n')).toEqual([
      'Fecha;Cliente;DNI;Plan;Clases;Medio;Monto;Anulado',
      '3/11/2026;Pérez, Ana;30123456;2 días por semana;8;Efectivo;32000,00;No',
      '15/11/2026;Gómez, Beto;;Pase libre;Libre;Transferencia;45000,50;No',
      '',
      'Total (sin anulados);;;;;;77000,50;',
      '',
    ])
    expect({ total, validos, anulados }).toEqual({ total: 77000.5, validos: 2, anulados: 0 })
  })

  it('los anulados van marcados y no suman al total', () => {
    const { csv, total, validos, anulados } = buildPaymentsCsv([
      pago(),
      pago({ id: 2, monto: 10000, anulado: true }),
    ])
    expect(csv).toContain(';10000,00;Sí')
    expect(csv).toContain('Total (sin anulados);;;;;;32000,00;')
    expect({ total, validos, anulados }).toEqual({ total: 32000, validos: 1, anulados: 1 })
  })

  it('sin pagos: solo encabezado y total en cero', () => {
    const { csv, validos } = buildPaymentsCsv([])
    expect(csv).toContain('Total (sin anulados);;;;;;0,00;')
    expect(validos).toBe(0)
  })
})

describe('csvField', () => {
  it('escapa ; comillas y saltos de línea', () => {
    expect(csvField('a;b')).toBe('"a;b"')
    expect(csvField('dijo "hola"')).toBe('"dijo ""hola"""')
    expect(csvField('dos\nlíneas')).toBe('"dos\nlíneas"')
    expect(csvField('normal')).toBe('normal')
  })

  it('neutraliza fórmulas (inyección en Excel)', () => {
    expect(csvField('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"')
    expect(csvField('+54')).toBe("'+54")
    expect(csvField('-1')).toBe("'-1")
    expect(csvField('@SUM(A1)')).toBe("'@SUM(A1)")
  })
})

describe('monthBounds y nombre de archivo', () => {
  it('primer y último día del mes (con febrero bisiesto)', () => {
    expect(monthBounds('2026-11')).toEqual({ desde: '2026-11-01', hasta: '2026-11-30' })
    expect(monthBounds('2028-02')).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' })
    expect(paymentsFileName('2026-11')).toBe('pagos-2026-11.csv')
  })
})
