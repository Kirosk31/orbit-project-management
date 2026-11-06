import type { ChecklistDto, ColumnDto, TaskDto } from '@orbit/shared'
import { describe, expect, it } from 'vitest'

import {
  moveTaskInList,
  setTaskCompletion,
  shiftColumnCounts,
  toggleChecklistItem,
} from './optimistic'

const task = (id: string, columnId: string) =>
  ({
    id,
    columnId,
    statusId: 's-todo',
    statusName: 'To do',
    isCompleted: false,
    completedAt: null,
  }) as unknown as TaskDto
const column = (id: string, taskCount: number) =>
  ({ id, statusId: `s-${id}`, statusName: id, taskCount }) as unknown as ColumnDto

describe('moveTaskInList', () => {
  it('moves only the dragged card and gives it the column status', () => {
    const list = { rows: [task('a', 'c1'), task('b', 'c1')], total: 2 }
    const moved = moveTaskInList(list, 'a', column('c2', 0))!
    expect(moved.rows[0]).toMatchObject({ columnId: 'c2', statusId: 's-c2', statusName: 'c2' })
    expect(moved.rows[1]).toBe(list.rows[1])
    expect(list.rows[0]!.columnId).toBe('c1')
  })
})

describe('shiftColumnCounts', () => {
  it('moves one count between columns and never goes negative', () => {
    const next = shiftColumnCounts([column('c1', 0), column('c2', 3)], 'c1', 'c2')!
    expect(next.map((c) => c.taskCount)).toEqual([0, 4])
    expect(shiftColumnCounts([column('c1', 2)], 'c1', 'c1')![0]!.taskCount).toBe(2)
  })
})

describe('setTaskCompletion', () => {
  it('stamps completion time and clears it on reopen', () => {
    const now = new Date('2026-11-06T10:00:00Z')
    expect(setTaskCompletion(task('a', 'c1'), true, now)).toMatchObject({
      isCompleted: true,
      completedAt: '2026-11-06T10:00:00.000Z',
    })
    expect(setTaskCompletion(task('a', 'c1'), false)).toMatchObject({ completedAt: null })
  })
})

describe('toggleChecklistItem', () => {
  it('flips the item and recounts completed items', () => {
    const lists = [
      {
        id: 'l1',
        items: [
          { id: 'i1', isCompleted: false },
          { id: 'i2', isCompleted: true },
        ],
        completedItems: 1,
      },
    ] as unknown as ChecklistDto[]
    const next = toggleChecklistItem(lists, 'l1', 'i1', true)!
    expect(next[0]!.completedItems).toBe(2)
    expect(next[0]!.items[0]!.isCompleted).toBe(true)
  })
})
