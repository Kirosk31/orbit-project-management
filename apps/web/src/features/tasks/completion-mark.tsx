import { TileGlyph } from '@orbit/brand'
import { useEffect, useRef, useState, type ReactNode } from 'react'

interface CompletionMarkProps {
  completed: boolean
  size?: number
  /** Rotation of the tile module; vary it so neighbours do not repeat. */
  turn?: number
  /** ISO time the task finished; lets a freshly mounted card still glaze. */
  completedAt?: string | null
}

const RECENT_MS = 4_000

function finishedJustNow(completed: boolean, completedAt: string | null | undefined): boolean {
  if (!completed || !completedAt) return false
  const age = Date.now() - new Date(completedAt).getTime()
  return age >= -RECENT_MS && age < RECENT_MS
}

/**
 * One task's tile. It glazes only on the open → done transition it witnesses,
 * or on a card that mounts moments after the task finished. An old finished
 * task never replays it.
 */
export function CompletionMark({
  completed,
  size = 16,
  turn = 0,
  completedAt,
}: CompletionMarkProps): ReactNode {
  const previous = useRef(completed)
  const [glaze, setGlaze] = useState(() => finishedJustNow(completed, completedAt))

  useEffect(() => {
    if (!previous.current && completed) setGlaze(true)
    else if (!completed) setGlaze(false)
    previous.current = completed
  }, [completed])

  return <TileGlyph state={completed ? 'done' : 'open'} size={size} turn={turn} glaze={glaze} />
}
