import type { Label, Prisma, PrismaClient, Task } from '@prisma/client'
import type { TaskPriority } from '@orbit/shared'

export interface TaskRow extends Task {
  statusName: string
  assignees: Array<{
    id: string
    userId: string
    email: string
    fullName: string
    avatarKey: string | null
  }>
  labels: Array<{
    id: string
    labelId: string
    name: string
    color: string
  }>
  subtasks: Array<{ isCompleted: boolean }>
}

export interface TaskListResult {
  rows: TaskRow[]
  total: number
}

export interface TaskActivityRow {
  id: string
  action: string
  entityType: string
  entityId: string | null
  oldValue: string | null
  newValue: string | null
  metadata: Prisma.JsonValue | null
  actorName: string
  createdAt: Date
}

export interface TaskFilters {
  boardId?: string
  statusId?: string
  assigneeId?: string
  priority?: TaskPriority
  search?: string
  archived: boolean
}

export interface TasksRepository {
  createTask(
    data: {
      orgId: string
      projectId: string
      createdById: string
      title: string
      description: string
      priority: TaskPriority
      dueDate: Date | null
      estimatedHours: number | null
      parentId: string | null
      boardId: string | null
      columnId: string | null
      statusId: string
      position: number
    },
    assigneeIds: string[],
    labelIds: string[],
  ): Promise<Task>
  findTaskById(id: string): Promise<TaskRow | null>
  listSubtasks(parentId: string): Promise<TaskRow[]>
  countSubtasks(parentId: string): Promise<number>
  updateTask(
    id: string,
    data: {
      title?: string
      description?: string | null
      priority?: TaskPriority
      dueDate?: Date | null
      estimatedHours?: number | null
      isCompleted?: boolean
      isArchived?: boolean
      completedAt?: Date | null
    },
  ): Promise<Task>
  softDeleteTask(id: string): Promise<void>
  listTasks(
    projectId: string,
    filters: TaskFilters,
    skip: number,
    take: number,
  ): Promise<TaskListResult>
  countTasksInColumn(columnId: string): Promise<number>
  countTasksInProject(projectId: string): Promise<number>
  moveTask(
    taskId: string,
    data: { boardId?: string | null; columnId?: string | null; statusId?: string },
    toPosition?: number,
  ): Promise<Task>
  addAssignee(taskId: string, userId: string): Promise<void>
  removeAssignee(taskId: string, userId: string): Promise<void>
  addLabel(taskId: string, labelId: string): Promise<void>
  removeLabel(taskId: string, labelId: string): Promise<void>
  listLabels(orgId: string): Promise<Array<Label & { taskCount: number }>>
  findLabelById(id: string): Promise<Label | null>
  createLabel(orgId: string, data: { name: string; color: string }): Promise<Label>
  updateLabel(id: string, data: { name?: string; color?: string }): Promise<Label>
  softDeleteLabel(id: string): Promise<void>
  listTaskActivity(taskId: string, take?: number): Promise<TaskActivityRow[]>
  recordTaskActivity(data: {
    taskId: string
    actorId: string
    action: string
    entityType: string
    entityId: string | null
    oldValue?: string | null
    newValue?: string | null
    metadata?: Prisma.InputJsonValue
  }): Promise<void>
}

const TASK_INCLUDE = {
  status: { select: { name: true } },
  assignees: {
    include: { user: { select: { id: true, email: true, fullName: true, avatarKey: true } } },
  },
  labels: {
    include: { label: { select: { id: true, name: true, color: true } } },
  },
  subtasks: {
    where: { deletedAt: null },
    select: { isCompleted: true },
  },
} satisfies Prisma.TaskInclude

function toTaskRow(row: Prisma.TaskGetPayload<{ include: typeof TASK_INCLUDE }>): TaskRow {
  return {
    ...row,
    statusName: row.status.name,
    assignees: row.assignees.map((a) => ({
      id: a.id,
      userId: a.user.id,
      email: a.user.email,
      fullName: a.user.fullName,
      avatarKey: a.user.avatarKey,
    })),
    labels: row.labels.map((l) => ({
      id: l.id,
      labelId: l.label.id,
      name: l.label.name,
      color: l.label.color,
    })),
  }
}

export class PrismaTasksRepository implements TasksRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createTask(
    data: {
      orgId: string
      projectId: string
      createdById: string
      title: string
      description: string
      priority: TaskPriority
      dueDate: Date | null
      estimatedHours: number | null
      parentId: string | null
      boardId: string | null
      columnId: string | null
      statusId: string
      position: number
    },
    assigneeIds: string[],
    labelIds: string[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({ data })
      if (assigneeIds.length > 0) {
        await tx.taskAssignee.createMany({
          data: assigneeIds.map((userId) => ({ taskId: task.id, userId })),
        })
      }
      if (labelIds.length > 0) {
        await tx.taskLabel.createMany({
          data: labelIds.map((labelId) => ({ taskId: task.id, labelId })),
        })
      }
      return task
    })
  }

  async findTaskById(id: string): Promise<TaskRow | null> {
    const row = await this.prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: TASK_INCLUDE,
    })
    return row ? toTaskRow(row) : null
  }

  async listSubtasks(parentId: string): Promise<TaskRow[]> {
    const rows = await this.prisma.task.findMany({
      where: { parentId, deletedAt: null },
      include: TASK_INCLUDE,
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    })
    return rows.map(toTaskRow)
  }

  countSubtasks(parentId: string): Promise<number> {
    return this.prisma.task.count({ where: { parentId, deletedAt: null } })
  }

  updateTask(
    id: string,
    data: {
      title?: string
      description?: string | null
      priority?: TaskPriority
      dueDate?: Date | null
      estimatedHours?: number | null
      isCompleted?: boolean
      isArchived?: boolean
      completedAt?: Date | null
    },
  ) {
    return this.prisma.task.update({ where: { id }, data })
  }

  async softDeleteTask(id: string): Promise<void> {
    await this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date(), isArchived: true },
    })
  }

  async listTasks(
    projectId: string,
    filters: TaskFilters,
    skip: number,
    take: number,
  ): Promise<TaskListResult> {
    const where: Prisma.TaskWhereInput = {
      projectId,
      deletedAt: null,
      parentId: null,
      isArchived: filters.archived,
      ...(filters.boardId ? { boardId: filters.boardId } : {}),
      ...(filters.statusId ? { statusId: filters.statusId } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.assigneeId ? { assignees: { some: { userId: filters.assigneeId } } } : {}),
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { description: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        include: TASK_INCLUDE,
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        skip,
        take,
      }),
      this.prisma.task.count({ where }),
    ])
    return { rows: rows.map(toTaskRow), total }
  }

  countTasksInColumn(columnId: string) {
    return this.prisma.task.count({
      where: { columnId, parentId: null, deletedAt: null, isArchived: false },
    })
  }

  countTasksInProject(projectId: string) {
    return this.prisma.task.count({
      where: { projectId, boardId: null, parentId: null, deletedAt: null, isArchived: false },
    })
  }

  async moveTask(
    taskId: string,
    data: { boardId?: string | null; columnId?: string | null; statusId?: string },
    toPosition?: number,
  ): Promise<Task> {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.findUnique({ where: { id: taskId } })
      if (!task) {
        return null as unknown as Task
      }
      const nextBoardId = data.boardId === undefined ? task.boardId : data.boardId
      const nextColumnId = data.columnId === undefined ? task.columnId : data.columnId
      const nextStatusId = data.statusId ?? task.statusId
      const siblings = await tx.task.findMany({
        where: {
          columnId: nextColumnId,
          deletedAt: null,
          isArchived: false,
          id: { not: taskId },
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      })
      const clamped =
        toPosition === undefined
          ? siblings.length
          : Math.max(0, Math.min(toPosition, siblings.length))
      const ordered = [
        ...siblings.slice(0, clamped).map((s) => s.id),
        taskId,
        ...siblings.slice(clamped).map((s) => s.id),
      ]
      for (let index = 0; index < ordered.length; index += 1) {
        await tx.task.update({ where: { id: ordered[index] }, data: { position: index } })
      }
      return tx.task.update({
        where: { id: taskId },
        data: { boardId: nextBoardId, columnId: nextColumnId, statusId: nextStatusId },
      })
    })
  }

  async addAssignee(taskId: string, userId: string): Promise<void> {
    await this.prisma.taskAssignee.createMany({ data: [{ taskId, userId }], skipDuplicates: true })
  }

  async removeAssignee(taskId: string, userId: string): Promise<void> {
    await this.prisma.taskAssignee.deleteMany({ where: { taskId, userId } })
  }

  async addLabel(taskId: string, labelId: string): Promise<void> {
    await this.prisma.taskLabel.createMany({ data: [{ taskId, labelId }], skipDuplicates: true })
  }

  async removeLabel(taskId: string, labelId: string): Promise<void> {
    await this.prisma.taskLabel.deleteMany({ where: { taskId, labelId } })
  }

  async listLabels(orgId: string) {
    return this.prisma.label
      .findMany({
        where: { orgId, deletedAt: null },
        include: { _count: { select: { tasks: true } } },
        orderBy: { name: 'asc' },
      })
      .then((rows) =>
        rows.map((row) => ({ ...row, taskCount: row._count.tasks, _count: undefined })),
      )
  }

  findLabelById(id: string) {
    return this.prisma.label.findFirst({ where: { id, deletedAt: null } })
  }

  createLabel(orgId: string, data: { name: string; color: string }) {
    return this.prisma.label.create({ data: { ...data, orgId } })
  }

  updateLabel(id: string, data: { name?: string; color?: string }) {
    return this.prisma.label.update({ where: { id }, data })
  }

  async softDeleteLabel(id: string): Promise<void> {
    await this.prisma.label.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  listTaskActivity(taskId: string, take = 50) {
    return this.prisma.taskActivity
      .findMany({
        where: { taskId },
        include: { actor: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
        take,
      })
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          action: row.action,
          entityType: row.entityType,
          entityId: row.entityId,
          oldValue: row.oldValue,
          newValue: row.newValue,
          metadata: row.metadata,
          actorName: row.actor.fullName,
          createdAt: row.createdAt,
        })),
      )
  }

  async recordTaskActivity(data: {
    taskId: string
    actorId: string
    action: string
    entityType: string
    entityId: string | null
    oldValue?: string | null
    newValue?: string | null
    metadata?: Prisma.InputJsonValue
  }): Promise<void> {
    await this.prisma.taskActivity.create({ data })
  }
}
