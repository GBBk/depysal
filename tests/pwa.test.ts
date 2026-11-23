import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// T17: lo que Chrome (Android) y Safari (iOS) necesitan para instalar la app.

const publicDir = new URL('../public/', import.meta.url)
const read = (path: string) => readFileSync(new URL(path, publicDir), 'utf8')

type Icon = { src: string; sizes: string; type: string; purpose: string }
type Manifest = {
  name: string
  short_name: string
  start_url: string
  display: string
  theme_color: string
  background_color: string
  icons: Icon[]
}

const manifest: Manifest = JSON.parse(read('manifest.webmanifest'))

function pngSize(path: string): string {
  const png = readFileSync(new URL(path.replace(/^\//, ''), publicDir))
  return `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`
}

describe('PWA', () => {
  it('el manifest tiene lo que pide Chrome para instalar', () => {
    expect(manifest.name).toBe('Deporte y Salud')
    expect(manifest.short_name).toBeTruthy()
    expect(manifest.start_url).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.theme_color).toMatch(/^#/)
    const sizes = manifest.icons.filter((i) => i.purpose === 'any').map((i) => i.sizes)
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']))
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true)
  })

  it('los íconos existen y tienen el tamaño que declaran', () => {
    for (const icon of manifest.icons) expect(pngSize(icon.src), icon.src).toBe(icon.sizes)
    expect(pngSize('/icons/apple-touch-icon.png')).toBe('180x180')
  })

  it('index.html enlaza el manifest y el ícono de iOS; existen el service worker y la página sin conexión', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"')
    expect(html).toContain('rel="apple-touch-icon" href="/icons/apple-touch-icon.png"')
    expect(existsSync(new URL('sw.js', publicDir))).toBe(true)
    expect(read('sw.js')).toContain("'/offline.html'")
    expect(read('offline.html')).toContain('Sin conexión')
  })
})
