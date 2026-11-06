import type { ColumnDto, TaskListItemDto } from '@orbit/shared'
import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import { BoardColumn, type BoardColumnProps } from '@/features/boards/board-column'
import { groupTasksByColumn } from '@/features/boards/group-tasks'

const column: ColumnDto = {
  id: 'column-a',
  boardId: 'board-a',
  statusId: 'status-a',
  statusName: 'To Do',
  name: 'To Do',
  color: null,
  position: 0,
  wipLimit: null,
  taskCount: 1,
} as ColumnDto

function makeTask(overrides: Partial<TaskListItemDto> = {}): TaskListItemDto {
  return {
    id: 'task-a',
    orgId: 'org-a',
    projectId: 'project-a',
    boardId: 'board-a',
    columnId: 'column-a',
    statusId: 'status-a',
    statusName: 'To Do',
    parentId: null,
    createdById: 'user-a',
    title: 'Write the brief',
    priority: 'NONE',
    dueDate: null,
    estimatedHours: null,
    trackedSeconds: 0,
    subtaskCount: 0,
    completedSubtaskCount: 0,
    isArchived: false,
    isCompleted: false,
    completedAt: null,
    position: 0,
    assignees: [],
    labels: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function buildProps(overrides: Partial<BoardColumnProps> = {}): BoardColumnProps {
  return {
    column,
    index: 0,
    columns: [column],
    tasks: [makeTask()],
    isLoadingTasks: false,
    isFiltering: false,
    isEditingName: false,
    canDrag: true,
    isBeingDragged: false,
    isColumnTarget: false,
    isTaskTarget: false,
    draggingTaskId: null,
    onColumnDragStart: vi.fn(),
    onColumnDragEnd: vi.fn(),
    onColumnDragOver: vi.fn(),
    onColumnDrop: vi.fn(),
    onStartRename: vi.fn(),
    onCancelRename: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
    onAddTask: vi.fn(),
    onOpenTask: vi.fn(),
    onTaskDragStart: vi.fn(),
    onTaskDragEnd: vi.fn(),
    onMoveTask: vi.fn(),
    ...overrides,
  }
}

describe('groupTasksByColumn', () => {
  it('groups tasks by column and keeps their order', () => {
    const tasks = [
      { id: '1', columnId: 'a' },
      { id: '2', columnId: 'b' },
      { id: '3', columnId: 'a' },
      { id: '4', columnId: null },
    ]

    const grouped = groupTasksByColumn(tasks)

    expect(grouped.get('a')?.map((task) => task.id)).toEqual(['1', '3'])
    expect(grouped.get('b')?.map((task) => task.id)).toEqual(['2'])
    expect(grouped.get('')?.map((task) => task.id)).toEqual(['4'])
  })
})

describe('BoardColumn', () => {
  it('opens a card by its id', () => {
    const props = buildProps()
    render(<BoardColumn {...props} />)

    fireEvent.click(screen.getByText('Write the brief'))

    expect(props.onOpenTask).toHaveBeenCalledWith('task-a')
  })

  it('starts a card drag without also dragging the column', () => {
    const props = buildProps()
    render(<BoardColumn {...props} />)

    fireEvent.dragStart(screen.getByText('Write the brief').closest('button')!)

    expect(props.onTaskDragStart).toHaveBeenCalledWith('task-a', expect.anything())
    expect(props.onColumnDragStart).not.toHaveBeenCalled()

    fireEvent.dragStart(screen.getByRole('region', { name: 'To Do' }))
    expect(props.onColumnDragStart).toHaveBeenCalledWith('column-a', expect.anything())
  })

  it('handles a drop itself instead of letting the board strip move it again', () => {
    const props = buildProps()
    const stripDrop = vi.fn()
    render(
      <div onDrop={stripDrop}>
        <BoardColumn {...props} />
      </div>,
    )

    fireEvent.drop(screen.getByRole('region', { name: 'To Do' }))

    expect(props.onColumnDrop).toHaveBeenCalledWith('column-a', 0, expect.anything())
    expect(stripDrop).not.toHaveBeenCalled()
  })

  it('skips re-rendering cards when the board re-renders with the same props', () => {
    // A card reads its title only when it renders, so count the reads.
    let titleReads = 0
    const task = makeTask()
    Object.defineProperty(task, 'title', {
      get: () => {
        titleReads += 1
        return 'Write the brief'
      },
    })
    const props = buildProps({ tasks: [task] })
    const { rerender } = render(<BoardColumn {...props} />)
    const afterFirstRender = titleReads
    expect(afterFirstRender).toBeGreaterThan(0)

    rerender(<BoardColumn {...props} />)
    expect(titleReads).toBe(afterFirstRender)

    // A change to the column re-renders it, but the unchanged card still bails out.
    rerender(<BoardColumn {...props} isTaskTarget />)
    expect(titleReads).toBe(afterFirstRender)
  })
})
