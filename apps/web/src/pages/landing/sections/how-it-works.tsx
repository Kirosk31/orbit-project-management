import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { RocketIcon, UserPlusIcon, KanbanSquareIcon } from 'lucide-react'

import { SectionHeading } from '@/components/marketing/section-heading'
import { RevealItem, RevealStagger } from '@/components/shared/reveal'

const STEPS = [
  {
    icon: UserPlusIcon,
    titleKey: 'how.step1Title',
    descriptionKey: 'how.step1Description',
    step: '01',
  },
  {
    icon: KanbanSquareIcon,
    titleKey: 'how.step2Title',
    descriptionKey: 'how.step2Description',
    step: '02',
  },
  {
    icon: RocketIcon,
    titleKey: 'how.step3Title',
    descriptionKey: 'how.step3Description',
    step: '03',
  },
] as const

export function HowItWorksSection(): ReactNode {
  const { t } = useTranslation()

  return (
    <section id="how-it-works" className="bg-muted/30 scroll-mt-20 border-y py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading titleKey="how.heading" />

        <RevealStagger className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <RevealItem key={step.step}>
              <div className="relative h-full rounded-xl p-6">
                <span className="text-muted-foreground/20 absolute top-4 right-4 text-5xl font-bold">
                  {step.step}
                </span>
                <div className="bg-card flex size-12 items-center justify-center rounded-xl border shadow-sm">
                  <step.icon className="text-primary size-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold">{t(step.titleKey)}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {t(step.descriptionKey)}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </section>
  )
}
