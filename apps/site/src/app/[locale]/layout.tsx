import '@fontsource-variable/archivo/wdth.css'
import '../globals.css'

import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { getDictionary } from '@/i18n/dictionary'
import { isSiteLocale, SITE_LOCALES } from '@/i18n/config'
import { languageAlternates, openGraphLocale } from '@/lib/locale-meta'
import { SITE_URL } from '@/lib/urls'

interface LocaleParams {
  params: Promise<{ locale: string }>
}

export const dynamicParams = false

export function generateStaticParams(): Array<{ locale: string }> {
  return SITE_LOCALES.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params
  if (!isSiteLocale(locale)) return {}
  const dict = getDictionary(locale)
  return {
    metadataBase: new URL(SITE_URL),
    title: dict.site.metaTitle,
    description: dict.site.metaDescription,
    applicationName: 'Orbit',
    alternates: { canonical: `/${locale}`, languages: languageAlternates() },
    openGraph: {
      type: 'website',
      siteName: 'Orbit',
      title: dict.site.metaTitle,
      description: dict.site.metaDescription,
      url: `/${locale}`,
      locale: openGraphLocale(locale),
      alternateLocale: SITE_LOCALES.filter((other) => other !== locale).map(openGraphLocale),
    },
    twitter: { card: 'summary_large_image' },
    icons: { icon: '/favicon.svg' },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#224bb2' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1d40' },
  ],
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleParams & { children: ReactNode }): Promise<ReactNode> {
  const { locale } = await params
  if (!isSiteLocale(locale)) notFound()
  const dict = getDictionary(locale)

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* External, not inline: it must run before paint under a strict CSP. */}
        <script src="/theme-init.js" />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <a
          href="#content"
          className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {dict.site.skipToContent}
        </a>
        {children}
      </body>
    </html>
  )
}
