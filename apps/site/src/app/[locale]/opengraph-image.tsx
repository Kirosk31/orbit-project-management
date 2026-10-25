import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ImageResponse } from 'next/og'

import { isSiteLocale, SITE_LOCALES } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Orbit'

export function generateStaticParams(): Array<{ locale: string }> {
  return SITE_LOCALES.map((locale) => ({ locale }))
}

// Satori has no CSS variables or OKLCH: these are the default skin's sRGB values.
const RAIL = '#13275f'
const TILE = '#224bb2'
const GLAZE = '#f8fafd'
const OCHRE = '#f0b135'
const MUTED = '#b9c6e6'

function tile(state: 'done' | 'open' | 'overdue', turn: number, edge: number): React.ReactElement {
  const fill = state === 'done' ? TILE : state === 'overdue' ? OCHRE : '#1c3576'
  return (
    <svg width={edge} height={edge} viewBox="0 0 16 16">
      <rect width="16" height="16" rx="1" fill={fill} />
      <g transform={`rotate(${turn} 8 8)`}>
        {state === 'open' ? (
          <path d="M0 9a7 7 0 0 1 7 7" fill="none" stroke="#5b6f9f" strokeWidth="1.25" />
        ) : (
          <path
            d="M0 5a11 11 0 0 1 11 11H0z"
            fill={state === 'done' ? GLAZE : '#7a4d06'}
            fillOpacity={state === 'done' ? 0.92 : 0.55}
          />
        )}
      </g>
    </svg>
  )
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<ImageResponse> {
  const { locale } = await params
  const dict = getDictionary(isSiteLocale(locale) ? locale : 'es')
  const [semibold, regular] = await Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/archivo-latin-600-normal.woff')),
    readFile(join(process.cwd(), 'assets/fonts/archivo-latin-400-normal.woff')),
  ])
  const turns = [0, 90, 180, 90, 270, 0, 180, 270]
  const states = Array.from({ length: 16 }, (_, index) =>
    index === 11 ? 'overdue' : index < 9 ? 'done' : 'open',
  ) as Array<'done' | 'open' | 'overdue'>

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: RAIL,
        color: GLAZE,
        fontFamily: 'Archivo',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <svg width="64" height="64" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="7" fill={TILE} />
          <path d="M6 26a6 6 0 0 1 6-6v6z" fill={GLAZE} />
          <path d="M6 9a17 17 0 0 1 17 17" fill="none" stroke={GLAZE} strokeWidth="2.5" />
          <circle cx="18.02" cy="13.98" r="3.2" fill={OCHRE} />
        </svg>
        <span style={{ fontSize: 40, fontWeight: 600 }}>Orbit</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 940 }}>
        <span style={{ fontSize: 76, fontWeight: 600, lineHeight: 1.04, letterSpacing: -2 }}>
          {dict.hero.title}
        </span>
        <span style={{ fontSize: 34, color: MUTED, lineHeight: 1.3 }}>{dict.hero.titleAccent}</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {states.map((state, index) => (
          <div key={index} style={{ display: 'flex' }}>
            {tile(state, turns[index % 8] ?? 0, 44)}
          </div>
        ))}
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Archivo', data: semibold, weight: 600, style: 'normal' },
        { name: 'Archivo', data: regular, weight: 400, style: 'normal' },
      ],
    },
  )
}
