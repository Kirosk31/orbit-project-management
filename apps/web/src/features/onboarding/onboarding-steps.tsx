import { TileGlyph, type TileState } from '@orbit/brand'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { OnboardingProgress } from './progress'

/**
 * First-run guide on Today: three steps, each one tile of the panel. Finished
 * steps glaze, the current one stays open with its action.
 */
export function OnboardingSteps({ progress }: { progress: OnboardingProgress }): ReactNode {
  const { t } = useTranslation()
  const steps = [
    {
      key: 'Workspace' as const,
      done: progress.hasWorkspace,
      to: '/app/organizations',
    },
    {
      key: 'Project' as const,
      done: progress.hasProject,
      to: '/app/projects',
    },
    {
      key: 'Task' as const,
      done: progress.hasTask,
      to: progress.firstProjectPath ?? '/app/projects',
    },
  ]
  const currentIndex = steps.findIndex((step) => !step.done)

  return (
    <section aria-labelledby="onboarding-heading" className="max-w-2xl">
      <h2 id="onboarding-heading" className="text-lg font-semibold">
        {t('dashboard.onboardingTitle')}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.onboardingHint')}</p>
      <ol className="mt-6 overflow-hidden rounded-lg border bg-card">
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex
          const state: TileState = step.done ? 'done' : 'open'
          return (
            <li
              key={step.key}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'flex items-center gap-4 border-b px-4 py-4 last:border-b-0',
                isCurrent && 'bg-[color-mix(in_srgb,var(--primary)_6%,var(--card))]',
              )}
            >
              <TileGlyph state={state} size={32} turn={index * 90} />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'font-medium',
                    step.done && 'text-muted-foreground line-through decoration-1',
                  )}
                >
                  {t(`dashboard.onboarding${step.key}`)}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {isCurrent
                    ? t(`dashboard.onboarding${step.key}Hint`)
                    : step.done
                      ? t('dashboard.onboardingDone')
                      : t('dashboard.onboardingStepOf', {
                          current: String(index + 1),
                          total: String(steps.length),
                        })}
                </p>
              </div>
              {isCurrent && (
                <Button asChild size="sm">
                  <Link to={step.to}>{t(`dashboard.onboarding${step.key}`)}</Link>
                </Button>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
