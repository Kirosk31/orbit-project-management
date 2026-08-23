import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRightIcon, PlayIcon, RadioIcon, ZapIcon } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const STATS = [
  { value: '4', key: 'hero.statsProjects' },
  { value: '5', key: 'hero.statsTeams' },
  { value: 'Socket.IO', key: 'hero.statsUptime' },
  { value: 'PostgreSQL', key: 'hero.statsStars' },
] as const

interface MockCard {
  titleKey:
    | 'hero.boardTaskDesign'
    | 'hero.boardTaskChecklist'
    | 'hero.boardTaskKanban'
    | 'hero.boardTaskRbac'
    | 'hero.boardTaskNotifications'
  priority: string
  avatars: readonly string[]
  time?: string
}

interface MockColumn {
  titleKey: 'hero.boardTodo' | 'hero.boardInProgress' | 'hero.boardDone'
  accent: string
  cards: readonly MockCard[]
}

const BOARD_COLUMNS: readonly MockColumn[] = [
  {
    titleKey: 'hero.boardTodo',
    accent: 'bg-muted-foreground',
    cards: [
      {
        titleKey: 'hero.boardTaskDesign',
        priority: 'bg-chart-3',
        avatars: ['SK', 'DR'],
      },
      {
        titleKey: 'hero.boardTaskChecklist',
        priority: 'bg-muted-foreground',
        avatars: ['AO'],
      },
    ],
  },
  {
    titleKey: 'hero.boardInProgress',
    accent: 'bg-chart-2',
    cards: [
      {
        titleKey: 'hero.boardTaskKanban',
        priority: 'bg-chart-5',
        avatars: ['SK', 'AO', 'DR'],
        time: '3h 12m',
      },
    ],
  },
  {
    titleKey: 'hero.boardDone',
    accent: 'bg-chart-1',
    cards: [
      {
        titleKey: 'hero.boardTaskRbac',
        priority: 'bg-chart-1',
        avatars: ['DR'],
      },
      {
        titleKey: 'hero.boardTaskNotifications',
        priority: 'bg-success',
        avatars: ['SK'],
      },
    ],
  },
] as const

function BoardMockup(): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="relative">
      <div className="absolute -inset-8 rounded-full bg-primary/20 blur-3xl" aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 32, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="bg-card relative rounded-xl border shadow-2xl"
        style={{ transformPerspective: 1000 }}
      >
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <span className="size-2.5 rounded-full bg-chart-5" />
          <span className="size-2.5 rounded-full bg-chart-3" />
          <span className="size-2.5 rounded-full bg-chart-1" />
          <span className="text-muted-foreground ml-3 text-xs font-medium">
            {t('hero.boardName')}
          </span>
          <Badge variant="success" className="ml-auto gap-1">
            <RadioIcon className="size-3" />
            {t('hero.boardLive')}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-3 p-4">
          {BOARD_COLUMNS.map((column, columnIndex) => (
            <div key={column.titleKey} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 px-1">
                <span className={`size-2 rounded-full ${column.accent}`} />
                <span className="text-muted-foreground text-xs font-semibold">
                  {t(column.titleKey)}
                </span>
              </div>
              {column.cards.map((card, cardIndex) => (
                <motion.div
                  key={card.titleKey}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 + columnIndex * 0.12 + cardIndex * 0.1 }}
                  className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-2.5"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`size-1.5 rounded-full ${card.priority}`} />
                    <span className="truncate text-xs font-medium">{t(card.titleKey)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-1.5">
                      {card.avatars.map((avatar) => (
                        <Avatar key={avatar} className="size-5 border-2 border-card">
                          <AvatarFallback className="text-[8px]">{avatar}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    {card.time && (
                      <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
                        <ZapIcon className="size-2.5" />
                        {card.time}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.9 }}
        className="bg-card absolute -left-6 -bottom-6 hidden items-center gap-3 rounded-xl border p-3 shadow-lg sm:flex"
      >
        <div className="bg-success/10 text-success flex size-9 items-center justify-center rounded-lg">
          <RadioIcon className="size-4" />
        </div>
        <div>
          <p className="text-xs font-semibold">{t('hero.boardRealtime')}</p>
          <p className="text-muted-foreground text-[11px]">{t('hero.boardOnline')}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.05 }}
        className="bg-card absolute -right-4 -top-5 hidden items-center gap-2 rounded-xl border p-3 shadow-lg sm:flex"
      >
        <Badge variant="warning" className="size-9 rounded-lg p-0">
          <ZapIcon className="size-4" />
        </Badge>
        <div>
          <p className="text-xs font-semibold">{t('hero.boardTaskCount')}</p>
          <p className="text-muted-foreground text-[11px]">{t('hero.boardDue')}</p>
        </div>
      </motion.div>
    </div>
  )
}

export function HeroSection(): ReactNode {
  const { t } = useTranslation()

  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div
        className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]"
        aria-hidden
      />
      <div
        className="absolute top-0 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <Badge variant="secondary" className="gap-2 px-3 py-1">
                <span className="bg-primary relative flex size-2 rounded-full">
                  <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" />
                </span>
                {t('hero.badge')}
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
              className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-6xl"
            >
              {t('hero.title')} <span className="text-gradient">{t('hero.titleAccent')}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              className="text-muted-foreground mt-6 max-w-xl text-lg text-pretty"
            >
              {t('hero.subtitle')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <Button size="lg" className="group" asChild>
                <Link to="/register">
                  {t('hero.ctaPrimary')}
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2" asChild>
                <Link to="/#features">
                  <PlayIcon className="size-4" />
                  {t('hero.ctaSecondary')}
                </Link>
              </Button>
            </motion.div>

            <motion.dl
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45, ease: 'easeOut' }}
              className="mt-12 grid grid-cols-2 gap-6 border-t pt-8 sm:grid-cols-4"
            >
              {STATS.map((stat) => (
                <div key={stat.key}>
                  <dt className="text-muted-foreground order-last text-xs">{t(stat.key)}</dt>
                  <dd className="text-2xl font-semibold tracking-tight">{stat.value}</dd>
                </div>
              ))}
            </motion.dl>
          </div>

          <div className="hidden sm:block">
            <BoardMockup />
          </div>
        </div>
      </div>
    </section>
  )
}
