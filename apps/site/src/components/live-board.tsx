'use client'

import { TilePanel, type Tile } from '@orbit/brand'
import { CircleCheckIcon, RotateCcwIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

export interface LiveBoardCopy {
  boardName: string
  online: string
  columns: { todo: string; inProgress: string; done: string }
  tasks: { design: string; checklist: string; kanban: string; rbac: string; notifications: string }
  /** Already formatted per state: [before landing, after landing]. */
  progress: [string, string]
  replay: string
  note: string
}

type TaskKey = keyof LiveBoardCopy['tasks']

const CARDS: Record<TaskKey, { people: string[]; priority: number }> = {
  design: { people: ['SK', 'DR'], priority: 3 },
  checklist: { people: ['AO'], priority: 1 },
  kanban: { people: ['SK', 'AO'], priority: 4 },
  rbac: { people: ['DR'], priority: 2 },
  notifications: { people: ['SK'], priority: 2 },
}

const TOTAL = 14

/** Demonstration only: a sprint with a few finished pieces already laid. */
function demoTiles(finished: number): Tile[] {
  return Array.from({ length: TOTAL }, (_, index) => ({
    id: `demo-${index}`,
    state: index < finished ? 'done' : index === 11 ? 'overdue' : 'open',
  }))
}

function priorityColor(priority: number): string {
  if (priority >= 4) return 'var(--priority-urgent)'
  if (priority === 3) return 'var(--priority-high)'
  return 'var(--priority-medium)'
}

function Card({
  title,
  taskKey,
  done,
  landing,
}: {
  title: string
  taskKey: TaskKey
  done: boolean
  landing?: boolean
}): ReactNode {
  const card = CARDS[taskKey]
  return (
    <div
      className={`flex flex-col gap-2 rounded-md border bg-card p-2.5 shadow-[0_1px_0_var(--border)] ${landing ? 'animate-land' : ''}`}
    >
      <span className="flex items-start gap-1.5 text-xs leading-snug font-medium">
        {done && (
          <CircleCheckIcon className="mt-px size-3.5 shrink-0 text-success" aria-hidden="true" />
        )}
        <span className={done ? 'text-muted-foreground' : ''}>{title}</span>
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
                  step <= card.priority ? priorityColor(card.priority) : 'var(--border)',
              }}
            />
          ))}
        </span>
        <span className="flex -space-x-1" aria-hidden="true">
          {card.people.map((person) => (
            <span
              key={person}
              className="flex size-6 items-center justify-center rounded-full bg-muted text-[0.6875rem] font-medium tracking-tight text-muted-foreground ring-2 ring-card"
            >
              {person}
            </span>
          ))}
        </span>
      </span>
    </div>
  )
}

/**
 * The product doing its job: one card lands in Done and its tile glazes in the
 * sprint panel. Server-rendered in its first state; the move runs on the client.
 */
export function LiveBoard({ copy }: { copy: LiveBoardCopy }): ReactNode {
  const [landed, setLanded] = useState(false)
  const [run, setRun] = useState(0)

  useEffect(() => {
    setLanded(false)
    const timer = window.setTimeout(() => setLanded(true), run === 0 ? 1400 : 600)
    return () => window.clearTimeout(timer)
  }, [run])

  const finished = landed ? 6 : 5
  const columns: Array<{ label: string; cards: TaskKey[]; done: boolean }> = [
    { label: copy.columns.todo, cards: ['design', 'checklist'], done: false },
    { label: copy.columns.inProgress, cards: landed ? [] : ['kanban'], done: false },
    {
      label: copy.columns.done,
      cards: landed ? ['kanban', 'rbac', 'notifications'] : ['rbac', 'notifications'],
      done: true,
    },
  ]

  return (
    <figure className="overflow-hidden rounded-xl bg-background text-foreground shadow-overlay">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-3">
        <span className="text-sm font-semibold">{copy.boardName}</span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
          {copy.online}
        </span>
        <TilePanel
          className="ml-auto"
          tiles={demoTiles(finished)}
          size={11}
          columns={TOTAL}
          label={copy.progress[landed ? 1 : 0]}
        />
      </div>
      <div className="grid grid-cols-3 gap-2.5 p-3">
        {columns.map((column) => (
          <div
            key={column.label}
            className="flex min-h-48 flex-col gap-2 rounded-md bg-muted/70 p-2"
          >
            <span className="flex items-center justify-between px-1 text-xs font-semibold">
              {column.label}
              <span className="font-normal text-muted-foreground tabular-nums">
                {column.cards.length}
              </span>
            </span>
            {column.cards.map((key) => (
              <Card
                key={`${key}-${run}`}
                taskKey={key}
                title={copy.tasks[key]}
                done={column.done}
                landing={column.done && key === 'kanban'}
              />
            ))}
          </div>
        ))}
      </div>
      <figcaption className="flex items-center justify-between gap-3 border-t px-4 py-2 text-xs text-muted-foreground">
        <span>{copy.note}</span>
        <button
          type="button"
          onClick={() => setRun((value) => value + 1)}
          className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          <RotateCcwIcon className="size-3.5" aria-hidden="true" />
          {copy.replay}
        </button>
      </figcaption>
    </figure>
  )
}
