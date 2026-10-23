import { LanguagesIcon, ShieldCheckIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'

const CLAIMS = [
  { icon: LanguagesIcon, title: 'proof.latamTitle', body: 'proof.latamBody' },
  { icon: ShieldCheckIcon, title: 'proof.securityTitle', body: 'proof.securityBody' },
] as const

/** The two claims a neighboring tool cannot copy: language and tenant isolation. */
export function ProofSection(): ReactNode {
  const { t } = useTranslation()

  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2
          className="max-w-2xl text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-4xl"
          style={{ fontStretch: '112%' }}
        >
          {t('proof.heading')}
        </h2>
        <div className="mt-12 grid gap-12 md:grid-cols-2">
          {CLAIMS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-rail text-rail-foreground">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-lg font-semibold">{t(title)}</h3>
                <p className="mt-2 max-w-md leading-relaxed text-muted-foreground">{t(body)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
