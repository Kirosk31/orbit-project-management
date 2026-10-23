import { LayoutGroup, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRightIcon, CircleCheckIcon } from 'lucide-react'

import { TilePanel, type Tile } from '@/components/shared/tile-panel'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

type CardKey =
  | 'hero.boardTaskDesign'
  | 'hero.boardTaskChecklist'
  | 'hero.boardTaskKanban'
  | 'hero.boardTaskRbac'
  | 'hero.boardTaskNotifications'

interface DemoCard {
  key: CardKey
  people: readonly string[]
  priority: number
}

const CARDS: Record<CardKey, DemoCard> = {
  'hero.boardTaskDesign': { key: 'hero.boardTaskDesign', people: ['SK', 'DR'], priority: 3 },
  'hero.boardTaskChecklist': { key: 'hero.boardTaskChecklist', people: ['AO'], priority: 1 },
  'hero.boardTaskKanban': { key: 'hero.boardTaskKanban', people: ['SK', 'AO'], priority: 4 },
  'hero.boardTaskRbac': { key: 'hero.boardTaskRbac', people: ['DR'], priority: 2 },
  'hero.boardTaskNotifications': {
    key: 'hero.boardTaskNotifications',
    people: ['SK'],
    priority: 2,
  },
}

const TODO: CardKey[] = ['hero.boardTaskDesign', 'hero.boardTaskChecklist']
const DONE_BEFORE: CardKey[] = ['hero.boardTaskRbac', 'hero.boardTaskNotifications']
const MOVING: CardKey = 'hero.boardTaskKanban'

/** Demonstration only: a sprint with a few finished pieces already laid. */
function demoTiles(finished: number): Tile[] {
  return Array.from({ length: 14 }, (_, index) => ({
    id: `demo-${index}`,
    state: index < finished ? 'done' : index === 11 ? 'overdue' : 'open',
  }))
}

function DemoCardView({ card, done }: { card: DemoCard; done: boolean }): ReactNode {
  const { t } = useTranslation()
  return (
    <motion.div
      layoutId={card.key}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className="flex flex-col gap-2 rounded-md border bg-card p-2.5 shadow-[0_1px_0_var(--border)]"
    >
      <span className="flex items-start gap-1.5 text-xs leading-snug font-medium">
        {done && <CircleCheckIcon className="mt-px size-3.5 shrink-0 text-success" />}
        <span className={done ? 'text-muted-foreground' : ''}>{t(card.key)}</span>
      </span>
      <span className="flex items-center justify-between">
        <span className="inline-flex items-end gap-px" aria-hidden="true">
          {[1, 2, 3, 4].map((step) => (
            <span
              key={step}
              className="w-[3px] rounded-[1px]"
              style={{
                height: 3 + step * 2,
                backgroundColor:
                  step <= card.priority
                    ? card.priority >= 4
                      ? 'var(--priority-urgent)'
                      : card.priority === 3
                        ? 'var(--priority-high)'
                        : 'var(--priority-medium)'
                    : 'var(--border)',
              }}
            />
          ))}
        </span>
        <span className="flex -space-x-1.5">
          {card.people.map((person) => (
            <Avatar key={person} className="size-5 ring-2 ring-card">
              <AvatarFallback className="text-[0.6875rem] tracking-tighter">
                {person}
              </AvatarFallback>
            </Avatar>
          ))}
        </span>
      </span>
    </motion.div>
  )
}

/**
 * The product doing its job: a live board where one card lands in Done and
 * its tile glazes in the sprint panel. Demonstration content, not customer data.
 */
function LiveBoard(): ReactNode {
  const { t } = useTranslation()
  const [landed, setLanded] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setLanded(true), 1400)
    return () => window.clearTimeout(timer)
  }, [])

  const finished = landed ? 6 : 5
  const columns: Array<{
    key: 'hero.boardTodo' | 'hero.boardInProgress' | 'hero.boardDone'
    cards: CardKey[]
  }> = [
    { key: 'hero.boardTodo', cards: TODO },
    { key: 'hero.boardInProgress', cards: landed ? [] : [MOVING] },
    { key: 'hero.boardDone', cards: landed ? [MOVING, ...DONE_BEFORE] : DONE_BEFORE },
  ]

  return (
    <div className="overflow-hidden rounded-xl bg-background text-foreground shadow-overlay">
      <div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-3">
          <span className="text-sm font-semibold">{t('hero.boardName')}</span>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
            {t('hero.boardOnline')}
          </span>
          <TilePanel
            className="ml-auto"
            tiles={demoTiles(finished)}
            size={11}
            columns={14}
            label={t('boards.progress', { done: String(finished), total: '14' })}
          />
        </div>
        <LayoutGroup>
          <div className="grid grid-cols-3 gap-2.5 p-3">
            {columns.map((column) => (
              <div
                key={column.key}
                className="flex min-h-48 flex-col gap-2 rounded-md bg-muted/70 p-2"
              >
                <span className="flex items-center justify-between px-1 text-xs font-semibold">
                  {t(column.key)}
                  <span className="font-normal text-muted-foreground tabular-nums">
                    {column.cards.length}
                  </span>
                </span>
                {column.cards.map((key) => (
                  <DemoCardView
                    key={key}
                    card={CARDS[key]}
                    done={column.key === 'hero.boardDone'}
                  />
                ))}
              </div>
            ))}
          </div>
        </LayoutGroup>
      </div>
    </div>
  )
}

export function HeroSection(): ReactNode {
  const { t } = useTranslation()

  return (
    <section id="top" className="bg-rail text-rail-foreground">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-4 pt-32 pb-20 sm:px-6 sm:pt-36 lg:grid-cols-[1fr_1.05fr] lg:px-8 lg:pb-28">
        <div>
          <h1
            className="text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.03em] text-balance sm:text-6xl lg:text-7xl"
            style={{ fontStretch: '112%' }}
          >
            {t('hero.title')}{' '}
            <span className="block pt-3 text-[0.55em] leading-tight font-medium tracking-[-0.015em] text-rail-muted-foreground">
              {t('hero.titleAccent')}
            </span>
          </h1>
          <p className="mt-7 max-w-lg text-lg text-pretty text-rail-muted-foreground">
            {t('hero.subtitle')}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="bg-rail-foreground text-rail hover:bg-[color-mix(in_srgb,var(--rail-foreground)_88%,var(--rail-accent))]"
              asChild
            >
              <Link to="/register">
                {t('hero.ctaPrimary')}
                <ArrowRightIcon />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="text-rail-foreground hover:bg-rail-accent hover:text-rail-foreground"
              asChild
            >
              <Link to="/#features">{t('hero.ctaSecondary')}</Link>
            </Button>
          </div>
        </div>

        <div className="-mx-2 sm:mx-0">
          <LiveBoard />
        </div>
      </div>
    </section>
  )
}
