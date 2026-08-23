import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRightIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/shared/reveal'

export function CtaSection(): ReactNode {
  const { t } = useTranslation()

  return (
    <section className="pb-20 sm:pb-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-cyan-600 px-6 py-16 text-center sm:px-16 sm:py-20">
            <div className="bg-dots absolute inset-0 opacity-20" aria-hidden />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
                {t('cta.title')}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-pretty text-white/80">{t('cta.subtitle')}</p>
              <Button
                size="lg"
                variant="secondary"
                className="group mt-8 bg-white text-foreground hover:bg-white/90"
                asChild
              >
                <Link to="/register">
                  {t('cta.button')}
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
