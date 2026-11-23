import { describe, expect, it } from 'vitest'
import { buildContactsVcf } from './contacts'

const ana = { nombre: 'Ana', apellido: 'Pérez', telefono: '011 15 5555-0101', activo: true }

describe('buildContactsVcf', () => {
  it('arma una vCard por cliente con el teléfono en formato +549', () => {
    const { vcf, incluidos, omitidos } = buildContactsVcf([ana])
    expect(vcf).toBe(
      'BEGIN:VCARD\r\nVERSION:3.0\r\nN:Pérez;Ana;;;\r\nFN:Ana Pérez\r\nTEL;TYPE=CELL:+5491155550101\r\nEND:VCARD\r\n',
    )
    expect(incluidos).toBe(1)
    expect(omitidos).toBe(0)
  })

  it('deja afuera las bajas y cuenta los activos sin teléfono válido', () => {
    const { vcf, incluidos, omitidos } = buildContactsVcf([
      ana,
      { ...ana, nombre: 'Baja', activo: false },
      { ...ana, nombre: 'Sin', telefono: null },
      { ...ana, nombre: 'Corto', telefono: '1234' },
    ])
    expect(incluidos).toBe(1)
    expect(omitidos).toBe(2)
    expect(vcf).not.toContain('Baja')
    expect(vcf.match(/BEGIN:VCARD/g)).toHaveLength(1)
  })

  it('escapa comas, punto y coma y saltos de línea', () => {
    const { vcf } = buildContactsVcf([{ ...ana, nombre: 'Ana; María', apellido: 'Pérez, Gómez' }])
    expect(vcf).toContain('N:Pérez\\, Gómez;Ana\\; María;;;')
    expect(vcf).toContain('FN:Ana\\; María Pérez\\, Gómez')
  })

  it('sin contactos el archivo queda vacío', () => {
    expect(buildContactsVcf([]).vcf).toBe('')
  })
})
