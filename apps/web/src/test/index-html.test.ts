import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const webRoot = resolve(__dirname, '../..')
const html = readFileSync(resolve(webRoot, 'index.html'), 'utf8')

describe('index.html', () => {
  it('preloads the Latin Archivo font from a path the build can resolve', () => {
    const preload = /<link[^>]*rel="preload"[^>]*>/s.exec(html)?.[0] ?? ''
    const href = /href="([^"]+)"/.exec(preload)?.[1] ?? ''

    expect(preload).toMatch(/as="font"/)
    expect(preload).toMatch(/type="font\/woff2"/)
    // Fonts are fetched in CORS mode; without crossorigin the preload is wasted.
    expect(preload).toMatch(/\bcrossorigin\b/)
    expect(href).toMatch(/archivo-latin-wdth-normal\.woff2$/)
    // Vite only resolves relative paths here, so a change in npm hoisting must fail loudly.
    expect(existsSync(resolve(webRoot, href))).toBe(true)
  })
})
