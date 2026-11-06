import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { Cta, Faq, Features, Hero, HowItWorks, Proof } from '@/components/sections'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { isSiteLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { SITE_URL } from '@/lib/urls'

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<ReactNode> {
  const { locale } = await params
  if (!isSiteLocale(locale)) notFound()
  const dict = getDictionary(locale)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Orbit',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: dict.site.metaDescription,
    inLanguage: locale,
    url: `${SITE_URL}/${locale}`,
  }

  return (
    <>
      <SiteHeader locale={locale} dict={dict} />
      <main id="content" tabIndex={-1} className="outline-none">
        <Hero dict={dict} />
        <Features dict={dict} />
        <HowItWorks dict={dict} />
        <Proof dict={dict} />
        <Faq dict={dict} />
        <Cta dict={dict} />
      </main>
      <SiteFooter dict={dict} />
      <script
        type="application/ld+json"
        // JSON-LD is data, not script; escaping "<" keeps it inert.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
    </>
  )
}
