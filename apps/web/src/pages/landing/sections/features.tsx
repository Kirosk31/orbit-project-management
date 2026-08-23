import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import {
  BarChart3Icon,
  KanbanSquareIcon,
  PlugIcon,
  RadioIcon,
  ShieldCheckIcon,
  ListChecksIcon,
} from 'lucide-react'

import { SectionHeading } from '@/components/marketing/section-heading'
import { RevealItem, RevealStagger } from '@/components/shared/reveal'

const FEATURES = [
  {
    icon: KanbanSquareIcon,
    titleKey: 'features.kanban.title',
    descriptionKey: 'features.kanban.description',
    accent: 'from-violet-500 to-purple-600',
  },
  {
    icon: ListChecksIcon,
    titleKey: 'features.tasks.title',
    descriptionKey: 'features.tasks.description',
    accent: 'from-sky-500 to-cyan-600',
  },
  {
    icon: RadioIcon,
    titleKey: 'features.realtime.title',
    descriptionKey: 'features.realtime.description',
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    icon: ShieldCheckIcon,
    titleKey: 'features.rbac.title',
    descriptionKey: 'features.rbac.description',
    accent: 'from-amber-500 to-orange-600',
  },
  {
    icon: BarChart3Icon,
    titleKey: 'features.analytics.title',
    descriptionKey: 'features.analytics.description',
    accent: 'from-rose-500 to-pink-600',
  },
  {
    icon: PlugIcon,
    titleKey: 'features.integrations.title',
    descriptionKey: 'features.integrations.description',
    accent: 'from-indigo-500 to-violet-600',
  },
] as const

export function FeaturesSection(): ReactNode {
  const { t } = useTranslation()

  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading titleKey="features.heading" subtitleKey="features.subtitle" />

        <RevealStagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <RevealItem key={feature.titleKey}>
              <div className="group bg-card hover:border-primary/40 h-full rounded-xl border p-6 transition-colors">
                <div
                  className={`bg-gradient-to-br ${feature.accent} flex size-11 items-center justify-center rounded-lg shadow-sm transition-transform group-hover:scale-105`}
                >
                  <feature.icon className="size-5 text-white" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{t(feature.titleKey)}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {t(feature.descriptionKey)}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </section>
  )
}
