import { TileGlyph, type TileState } from '@orbit/brand'
import { ArrowRightIcon, ChevronDownIcon, LanguagesIcon, ShieldCheckIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { format, type Dictionary } from '@/i18n/dictionary'
import { appUrl } from '@/lib/urls'

import { LiveBoard } from './live-board'
import { button, display } from './styles'

interface SectionProps {
  dict: Dictionary
}

export function Hero({ dict }: SectionProps): ReactNode {
  const progress = (done: number): string =>
    format(dict.boards.progress, { done: String(done), total: '14' })

  return (
    <section className="bg-rail text-rail-foreground">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-4 pt-16 pb-20 sm:px-6 sm:pt-20 lg:grid-cols-[1fr_1.05fr] lg:px-8 lg:pb-28">
        <div>
          <h1
            className="text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.03em] text-balance sm:text-6xl lg:text-7xl"
            style={display}
          >
            {dict.hero.title}{' '}
            <span className="block pt-3 text-[0.55em] leading-tight font-medium tracking-[-0.015em] text-rail-muted-foreground">
              {dict.hero.titleAccent}
            </span>
          </h1>
          <p className="mt-7 max-w-lg text-lg text-pretty text-rail-muted-foreground">
            {dict.hero.subtitle}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href={appUrl('/register')} className={button.onRail}>
              {dict.hero.ctaPrimary}
              <ArrowRightIcon aria-hidden="true" />
            </a>
            <a href="#features" className={button.ghostOnRail}>
              {dict.hero.ctaSecondary}
            </a>
          </div>
        </div>

        <div className="-mx-2 sm:mx-0">
          <LiveBoard
            copy={{
              boardName: dict.hero.boardName,
              online: dict.hero.boardOnline,
              columns: {
                todo: dict.hero.boardTodo,
                inProgress: dict.hero.boardInProgress,
                done: dict.hero.boardDone,
              },
              tasks: {
                design: dict.hero.boardTaskDesign,
                checklist: dict.hero.boardTaskChecklist,
                kanban: dict.hero.boardTaskKanban,
                rbac: dict.hero.boardTaskRbac,
                notifications: dict.hero.boardTaskNotifications,
              },
              progress: [progress(5), progress(6)],
              replay: dict.site.replay,
              note: dict.site.demoNote,
            }}
          />
        </div>
      </div>
    </section>
  )
}

const FEATURES = [
  { key: 'kanban', state: 'done' },
  { key: 'tasks', state: 'done' },
  { key: 'realtime', state: 'overdue' },
  { key: 'rbac', state: 'done' },
  { key: 'analytics', state: 'done' },
  { key: 'integrations', state: 'open' },
] as const satisfies ReadonlyArray<{ key: keyof Dictionary['features']; state: TileState }>

export function Features({ dict }: SectionProps): ReactNode {
  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.5fr] lg:gap-20 lg:px-8">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2
            className="text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-4xl"
            style={display}
          >
            {dict.features.heading}
          </h2>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">{dict.features.subtitle}</p>
        </div>

        <ol className="grid gap-x-12 sm:grid-cols-2">
          {FEATURES.map((feature, index) => (
            <li key={feature.key} className="flex gap-4 border-t py-7">
              <TileGlyph state={feature.state} size={28} turn={[0, 90, 180, 270][index % 4] ?? 0} />
              <div className="min-w-0">
                <h3 className="font-semibold">{dict.features[feature.key].title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-pretty text-muted-foreground">
                  {dict.features[feature.key].description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function HowItWorks({ dict }: SectionProps): ReactNode {
  const steps: Array<{ title: string; description: string; state: TileState }> = [
    { title: dict.how.step1Title, description: dict.how.step1Description, state: 'done' },
    { title: dict.how.step2Title, description: dict.how.step2Description, state: 'done' },
    { title: dict.how.step3Title, description: dict.how.step3Description, state: 'open' },
  ]

  return (
    <section id="how-it-works" className="scroll-mt-20 border-y bg-muted/50 py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2
          className="max-w-xl text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-4xl"
          style={display}
        >
          {dict.how.heading}
        </h2>
        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
            <li key={step.title}>
              <div className="flex items-center gap-3">
                <TileGlyph state={step.state} size={28} turn={index * 90} />
                <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                {index < steps.length - 1 && (
                  <span className="hidden h-px flex-1 bg-border md:block" aria-hidden="true" />
                )}
              </div>
              <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-pretty text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/** The two claims a neighboring tool cannot copy: language and tenant isolation. */
export function Proof({ dict }: SectionProps): ReactNode {
  const claims = [
    { icon: LanguagesIcon, title: dict.proof.latamTitle, body: dict.proof.latamBody },
    { icon: ShieldCheckIcon, title: dict.proof.securityTitle, body: dict.proof.securityBody },
  ]

  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2
          className="max-w-2xl text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-4xl"
          style={display}
        >
          {dict.proof.heading}
        </h2>
        <div className="mt-12 grid gap-12 md:grid-cols-2">
          {claims.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-rail text-rail-foreground">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 max-w-md leading-relaxed text-pretty text-muted-foreground">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const FAQ = [1, 2, 3, 4, 5] as const

/** Native disclosures: answers are in the HTML for readers and crawlers alike. */
export function Faq({ dict }: SectionProps): ReactNode {
  return (
    <section id="faq" className="scroll-mt-20 border-t py-20 sm:py-28">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.5fr] lg:gap-20 lg:px-8">
        <h2
          className="text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-4xl"
          style={display}
        >
          {dict.faq.heading}
        </h2>
        <div className="divide-y border-y">
          {FAQ.map((index) => (
            <details key={index} className="group" open={index === 1}>
              <summary className="flex cursor-pointer items-center justify-between gap-4 py-5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                {dict.faq[`q${index}`]}
                <ChevronDownIcon
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="max-w-[65ch] pb-6 text-sm leading-relaxed text-pretty text-muted-foreground">
                {dict.faq[`a${index}`]}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

const WALL: TileState[] = Array.from({ length: 18 }, (_, index) =>
  index === 7 ? 'overdue' : index % 5 === 3 ? 'open' : 'done',
)

export function Cta({ dict }: SectionProps): ReactNode {
  return (
    <section className="pb-20 sm:pb-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 overflow-hidden rounded-xl bg-rail px-6 py-14 text-rail-foreground sm:px-12 md:grid-cols-[1.4fr_1fr]">
          <div>
            <h2
              className="max-w-xl text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-4xl"
              style={display}
            >
              {dict.cta.title}
            </h2>
            <p className="mt-4 max-w-lg text-pretty text-rail-muted-foreground">
              {dict.cta.subtitle}
            </p>
            <a href={appUrl('/register')} className={`${button.onRail} mt-8`}>
              {dict.cta.button}
              <ArrowRightIcon aria-hidden="true" />
            </a>
          </div>
          <div
            className="hidden w-fit grid-cols-6 gap-1.5 justify-self-end md:grid [--tile-done:var(--rail-accent)] [--tile-glaze:var(--rail-foreground)] [--tile-open:color-mix(in_srgb,var(--rail)_70%,var(--rail-accent))]"
            aria-hidden="true"
          >
            {WALL.map((state, index) => (
              <TileGlyph key={index} state={state} size={40} turn={((index * 5) % 4) * 90} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
