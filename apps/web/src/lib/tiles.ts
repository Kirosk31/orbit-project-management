import type { Tile, TileState } from '@/components/shared/tile-panel'

const TILE_ORDER: Record<TileState, number> = { done: 0, overdue: 1, open: 2 }

/**
 * Builds tiles from tasks: finished glazes, past-due turns ochre. Finished
 * tiles lead so the wall reads as being laid from the first course.
 */
export function tilesFromTasks(
  tasks: Array<{ id: string; isCompleted?: boolean | null; dueDate?: string | null }>,
  now: number = Date.now(),
): Tile[] {
  return tasks
    .map((task): Tile => ({
      id: task.id,
      state: task.isCompleted
        ? 'done'
        : task.dueDate && new Date(task.dueDate).getTime() < now
          ? 'overdue'
          : 'open',
    }))
    .sort((a, b) => TILE_ORDER[a.state] - TILE_ORDER[b.state])
}
