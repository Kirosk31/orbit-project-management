import type { Column, Label } from '@prisma/client'
import type {
  CreateLabelDto,
  CreateSubtaskDto,
  CreateTaskDto,
  LabelDto,
  MoveTaskDto,
  ProjectRealtimeEvent,
  TaskActivityDto,
  TaskDto,
  UpdateLabelDto,
  UpdateTaskDto,
} from '@orbit/shared'
import type { TaskQuery } from '@orbit/shared'
import { toPaginationParams } from '@orbit/shared'
import { badRequest, conflict, notFound } from '../../core/errors/index.js'
import type { OrganizationsRepository } from '../organizations/organizations.repository.js'
import type { BoardsRepository } from '../boards/boards.repository.js'
import type { TaskRow, TasksRepository } from './tasks.repository.js'
import type { NotificationsService } from '../notifications/notifications.service.js'
import type { RealtimePublisher } from '../realtime/realtime.publisher.js'

export interface TasksServiceDependencies {
  repository: TasksRepository
  boards: BoardsRepository
  organizations: OrganizationsRepository
  notifications: NotificationsService
  realtime?: RealtimePublisher
}

export class TasksService {
  constructor(private readonly deps: TasksServiceDependencies) {}

  async createTask(
    projectId: string,
    orgId: string,
    actorId: string,
    dto: CreateTaskDto,
  ): Promise<TaskDto> {
    const { column, statusId } = await this.resolvePlacement(projectId, orgId, dto)

    if (dto.assigneeIds.length > 0) {
      await this.verifyOrgMembers(orgId, dto.assigneeIds)
    }
    if (dto.labelIds.length > 0) {
      await this.verifyOrgLabels(orgId, dto.labelIds)
    }

    const position = column
      ? await this.deps.repository.countTasksInColumn(column.id)
      : await this.deps.repository.countTasksInProject(projectId)

    const task = await this.deps.repository.createTask(
      {
        orgId,
        projectId,
        createdById: actorId,
        title: dto.title,
        description: dto.description ?? '',
        priority: dto.priority ?? 'NONE',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        estimatedHours: dto.estimatedHours ?? null,
        parentId: null,
        boardId: column?.boardId ?? null,
        columnId: column?.id ?? null,
        statusId,
        position,
      },
      dto.assigneeIds,
      dto.labelIds,
    )

    await this.deps.repository.recordTaskActivity({
      taskId: task.id,
      actorId,
      action: 'task.created',
      entityType: 'TASK',
      entityId: task.id,
      metadata: { title: dto.title },
    })

    if (dto.assigneeIds.length > 0) {
      await Promise.all(
        dto.assigneeIds.map((userId) =>
          this.deps.notifications.taskAssigned({
            orgId,
            taskId: task.id,
            taskTitle: dto.title,
            userId,
          }),
        ),
      )
    }

    const created = await this.getTask(task.id)
    this.emitTaskEvent('task.created', created, actorId)
    return created
  }

  async getTask(taskId: string): Promise<TaskDto> {
    const row = await this.findTask(taskId)
    return this.toTaskDto(row)
  }

  async createSubtask(
    parentTaskId: string,
    actorId: string,
    dto: CreateSubtaskDto,
  ): Promise<TaskDto> {
    const parent = await this.findTask(parentTaskId)
    if (parent.parentId) {
      throw badRequest('Nested subtasks are not supported')
    }

    if (dto.assigneeIds.length > 0) {
      await this.verifyOrgMembers(parent.orgId, dto.assigneeIds)
    }
    if (dto.labelIds.length > 0) {
      await this.verifyOrgLabels(parent.orgId, dto.labelIds)
    }

    const position = await this.deps.repository.countSubtasks(parent.id)
    const subtask = await this.deps.repository.createTask(
      {
        orgId: parent.orgId,
        projectId: parent.projectId,
        createdById: actorId,
        title: dto.title,
        description: dto.description ?? '',
        priority: dto.priority ?? 'NONE',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        estimatedHours: dto.estimatedHours ?? null,
        parentId: parent.id,
        boardId: null,
        columnId: null,
        statusId: parent.statusId,
        position,
      },
      dto.assigneeIds,
      dto.labelIds,
    )

    await Promise.all([
      this.deps.repository.recordTaskActivity({
        taskId: subtask.id,
        actorId,
        action: 'task.created',
        entityType: 'TASK',
        entityId: subtask.id,
        metadata: { parentTaskId: parent.id },
      }),
      this.deps.repository.recordTaskActivity({
        taskId: parent.id,
        actorId,
        action: 'task.subtask_created',
        entityType: 'TASK',
        entityId: subtask.id,
      }),
    ])

    if (dto.assigneeIds.length > 0) {
      await Promise.all(
        dto.assigneeIds.map((userId) =>
          this.deps.notifications.taskAssigned({
            orgId: parent.orgId,
            taskId: subtask.id,
            taskTitle: subtask.title,
            userId,
          }),
        ),
      )
    }

    const created = await this.getTask(subtask.id)
    this.emitTaskEvent('task.created', created, actorId, 'subtask')
    return created
  }

  async listSubtasks(parentTaskId: string): Promise<TaskDto[]> {
    const parent = await this.findTask(parentTaskId)
    if (parent.parentId) {
      throw badRequest('Nested subtasks are not supported')
    }
    const rows = await this.deps.repository.listSubtasks(parent.id)
    return rows.map((row) => this.toTaskDto(row))
  }

  async listTasks(
    projectId: string,
    query: TaskQuery,
  ): Promise<{ rows: TaskDto[]; total: number }> {
    const { skip, take } = toPaginationParams(query)
    const result = await this.deps.repository.listTasks(
      projectId,
      {
        statusId: query.statusId,
        assigneeId: query.assigneeId,
        priority: query.priority,
        search: query.search,
        archived: query.archived,
      },
      skip,
      take,
    )
    return { rows: result.rows.map((row) => this.toTaskDto(row)), total: result.total }
  }

  async listBoardTasks(
    boardId: string,
    query: TaskQuery,
  ): Promise<{ rows: TaskDto[]; total: number }> {
    const board = await this.deps.boards.findBoardById(boardId)
    if (!board) {
      throw notFound('Board not found')
    }
    const { skip, take } = toPaginationParams(query)
    const result = await this.deps.repository.listTasks(
      board.projectId,
      {
        boardId,
        statusId: query.statusId,
        assigneeId: query.assigneeId,
        priority: query.priority,
        search: query.search,
        archived: query.archived,
      },
      skip,
      take,
    )
    return { rows: result.rows.map((row) => this.toTaskDto(row)), total: result.total }
  }

  async updateTask(
    taskId: string,
    orgId: string,
    actorId: string,
    dto: UpdateTaskDto,
  ): Promise<TaskDto> {
    const task = await this.findTask(taskId)
    await this.deps.repository.updateTask(task.id, {
      ...dto,
      dueDate: dto.dueDate === undefined ? undefined : dto.dueDate ? new Date(dto.dueDate) : null,
      completedAt: dto.isCompleted === undefined ? undefined : dto.isCompleted ? new Date() : null,
    })
    await this.deps.repository.recordTaskActivity({
      taskId: task.id,
      actorId,
      action: 'task.updated',
      entityType: 'TASK',
      entityId: task.id,
      metadata: { changed: Object.keys(dto) },
    })
    const updated = await this.getTask(task.id)
    this.emitTaskEvent('task.updated', updated, actorId)
    return updated
  }

  async deleteTask(taskId: string, actorId: string): Promise<void> {
    const task = await this.findTask(taskId)
    await this.deps.repository.softDeleteTask(task.id)
    await this.deps.repository.recordTaskActivity({
      taskId: task.id,
      actorId,
      action: 'task.deleted',
      entityType: 'TASK',
      entityId: task.id,
    })
    this.emitTaskEvent('task.deleted', this.toTaskDto(task), actorId)
  }

  async setArchived(taskId: string, actorId: string, isArchived: boolean): Promise<TaskDto> {
    const task = await this.findTask(taskId)
    await this.deps.repository.updateTask(task.id, { isArchived })
    await this.deps.repository.recordTaskActivity({
      taskId: task.id,
      actorId,
      action: isArchived ? 'task.archived' : 'task.restored',
      entityType: 'TASK',
      entityId: task.id,
    })
    const updated = await this.getTask(task.id)
    this.emitTaskEvent('task.updated', updated, actorId, isArchived ? 'archived' : 'restored')
    return updated
  }

  async moveTask(taskId: string, orgId: string, actorId: string, dto: MoveTaskDto): Promise<void> {
    const task = await this.findTask(taskId)
    if (task.parentId) {
      throw badRequest('Subtasks cannot be moved to board columns')
    }

    let nextColumnId: string | null | undefined = dto.columnId
    let nextBoardId: string | null | undefined
    let nextStatusId = dto.statusId

    if (dto.columnId) {
      const column = await this.deps.boards.findColumnById(dto.columnId)
      if (!column) {
        throw notFound('Column not found')
      }
      const columnBoard = await this.deps.boards.findBoardById(column.boardId)
      if (!columnBoard || columnBoard.projectId !== task.projectId) {
        throw badRequest('The column does not belong to this project', { field: 'columnId' })
      }
      nextBoardId = column.boardId
      nextStatusId = column.statusId
    } else if (dto.statusId) {
      const status = await this.deps.boards.findOrgStatusById(orgId, dto.statusId)
      if (!status) {
        throw badRequest('The selected status does not belong to this organization', {
          field: 'statusId',
        })
      }
      nextBoardId = null
      nextColumnId = null
    }

    await this.deps.repository.moveTask(
      task.id,
      { boardId: nextBoardId, columnId: nextColumnId, statusId: nextStatusId },
      dto.toPosition,
    )
    await this.deps.repository.recordTaskActivity({
      taskId: task.id,
      actorId,
      action: 'task.moved',
      entityType: 'TASK',
      entityId: task.id,
      metadata: { columnId: nextColumnId ?? null, statusId: nextStatusId ?? null },
    })

    if (nextStatusId && nextStatusId !== task.statusId) {
      const nextStatus = await this.deps.boards.findOrgStatusById(task.orgId, nextStatusId)
      const statusName = nextStatus?.name ?? 'updated'
      const recipients = task.assignees
        .map((assignee) => assignee.userId)
        .filter((id, index, ids) => id !== actorId && ids.indexOf(id) === index)

      if (recipients.length > 0) {
        await Promise.all(
          recipients.map((userId) =>
            this.deps.notifications.taskStatusChanged({
              orgId: task.orgId,
              taskId: task.id,
              taskTitle: task.title,
              statusName,
              userId,
            }),
          ),
        )
      }
    }
    this.emitTaskEvent('task.moved', await this.getTask(task.id), actorId)
  }

  async addAssignee(taskId: string, userId: string, actorId: string): Promise<TaskDto> {
    const task = await this.findTask(taskId)
    const membership = await this.deps.organizations.getMembership(task.orgId, userId)
    if (!membership || !membership.isActive) {
      throw badRequest('User is not a member of this organization', { field: 'userId' })
    }
    await this.deps.repository.addAssignee(task.id, userId)
    await this.deps.repository.recordTaskActivity({
      taskId: task.id,
      actorId,
      action: 'task.assignee_added',
      entityType: 'TASK',
      entityId: task.id,
      metadata: { userId },
    })

    await this.deps.notifications.taskAssigned({
      orgId: task.orgId,
      taskId: task.id,
      taskTitle: task.title,
      userId,
    })

    const updated = await this.getTask(task.id)
    this.emitTaskEvent('task.updated', updated, actorId, 'assignee-added')
    return updated
  }

  async removeAssignee(taskId: string, userId: string, actorId: string): Promise<TaskDto> {
    const task = await this.findTask(taskId)
    await this.deps.repository.removeAssignee(task.id, userId)
    await this.deps.repository.recordTaskActivity({
      taskId: task.id,
      actorId,
      action: 'task.assignee_removed',
      entityType: 'TASK',
      entityId: task.id,
      metadata: { userId },
    })
    const updated = await this.getTask(task.id)
    this.emitTaskEvent('task.updated', updated, actorId, 'assignee-removed')
    return updated
  }

  async addLabel(taskId: string, labelId: string, actorId: string): Promise<TaskDto> {
    const task = await this.findTask(taskId)
    const label = await this.deps.repository.findLabelById(labelId)
    if (!label || label.orgId !== task.orgId) {
      throw badRequest('The label does not belong to this organization', { field: 'labelId' })
    }
    await this.deps.repository.addLabel(task.id, labelId)
    await this.deps.repository.recordTaskActivity({
      taskId: task.id,
      actorId,
      action: 'task.label_added',
      entityType: 'TASK',
      entityId: task.id,
      metadata: { labelId, labelName: label.name },
    })
    const updated = await this.getTask(task.id)
    this.emitTaskEvent('task.updated', updated, actorId, 'label-added')
    return updated
  }

  async removeLabel(taskId: string, labelId: string, actorId: string): Promise<TaskDto> {
    const task = await this.findTask(taskId)
    await this.deps.repository.removeLabel(task.id, labelId)
    await this.deps.repository.recordTaskActivity({
      taskId: task.id,
      actorId,
      action: 'task.label_removed',
      entityType: 'TASK',
      entityId: task.id,
      metadata: { labelId },
    })
    const updated = await this.getTask(task.id)
    this.emitTaskEvent('task.updated', updated, actorId, 'label-removed')
    return updated
  }

  async listTaskActivity(taskId: string): Promise<TaskActivityDto[]> {
    const task = await this.findTask(taskId)
    const rows = await this.deps.repository.listTaskActivity(task.id)
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      oldValue: row.oldValue,
      newValue: row.newValue,
      metadata: row.metadata as Record<string, unknown> | null,
      actorName: row.actorName,
      createdAt: row.createdAt.toISOString(),
    }))
  }

  async listLabels(orgId: string): Promise<LabelDto[]> {
    const labels = await this.deps.repository.listLabels(orgId)
    return labels.map((label) => ({
      id: label.id,
      orgId: label.orgId,
      name: label.name,
      color: label.color,
      taskCount: label.taskCount,
      createdAt: label.createdAt.toISOString(),
    }))
  }

  async createLabel(orgId: string, dto: CreateLabelDto): Promise<LabelDto> {
    const existing = await this.deps.repository.listLabels(orgId)
    if (existing.some((label) => label.name.toLowerCase() === dto.name.toLowerCase())) {
      throw conflict('A label with this name already exists', { field: 'name' })
    }
    const label = await this.deps.repository.createLabel(orgId, {
      name: dto.name,
      color: dto.color,
    })
    return this.toLabelDto(label, 0)
  }

  async updateLabel(labelId: string, orgId: string, dto: UpdateLabelDto): Promise<LabelDto> {
    const label = await this.findLabel(labelId, orgId)
    const updated = await this.deps.repository.updateLabel(label.id, dto)
    const count = await this.findLabelTaskCount(orgId, updated.id)
    return this.toLabelDto(updated, count)
  }

  async deleteLabel(labelId: string, orgId: string): Promise<void> {
    const label = await this.findLabel(labelId, orgId)
    await this.deps.repository.softDeleteLabel(label.id)
  }

  private async resolvePlacement(
    projectId: string,
    orgId: string,
    dto: CreateTaskDto,
  ): Promise<{ column: Column | null; statusId: string }> {
    if (dto.columnId) {
      const column = await this.deps.boards.findColumnById(dto.columnId)
      if (!column) {
        throw notFound('Column not found')
      }
      const board = await this.deps.boards.findBoardById(column.boardId)
      if (!board || board.projectId !== projectId) {
        throw badRequest('The column does not belong to this project', { field: 'columnId' })
      }
      return { column, statusId: column.statusId }
    }

    if (dto.statusId) {
      const status = await this.deps.boards.findOrgStatusById(orgId, dto.statusId)
      if (!status) {
        throw badRequest('The selected status does not belong to this organization', {
          field: 'statusId',
        })
      }
      return { column: null, statusId: status.id }
    }

    const fallback = await this.deps.boards.findDefaultStatus(orgId)
    if (!fallback) {
      throw badRequest('No default status is configured for this organization')
    }
    return { column: null, statusId: fallback.id }
  }

  private async verifyOrgMembers(orgId: string, userIds: string[]): Promise<void> {
    for (const userId of userIds) {
      const membership = await this.deps.organizations.getMembership(orgId, userId)
      if (!membership || !membership.isActive) {
        throw badRequest('One or more assignees are not members of this organization', {
          field: 'assigneeIds',
        })
      }
    }
  }

  private async verifyOrgLabels(orgId: string, labelIds: string[]): Promise<void> {
    for (const labelId of labelIds) {
      const label = await this.deps.repository.findLabelById(labelId)
      if (!label || label.orgId !== orgId) {
        throw badRequest('One or more labels do not belong to this organization', {
          field: 'labelIds',
        })
      }
    }
  }

  private async findLabelTaskCount(orgId: string, labelId: string): Promise<number> {
    const labels = await this.deps.repository.listLabels(orgId)
    return labels.find((item) => item.id === labelId)?.taskCount ?? 0
  }

  private async findTask(taskId: string) {
    const row = await this.deps.repository.findTaskById(taskId)
    if (!row) {
      throw notFound('Task not found')
    }
    return row
  }

  private async findLabel(labelId: string, orgId: string): Promise<Label> {
    const label = await this.deps.repository.findLabelById(labelId)
    if (!label || label.orgId !== orgId) {
      throw notFound('Label not found')
    }
    return label
  }

  private toTaskDto(task: TaskRow): TaskDto {
    return {
      id: task.id,
      orgId: task.orgId,
      projectId: task.projectId,
      boardId: task.boardId,
      columnId: task.columnId,
      statusId: task.statusId,
      statusName: task.statusName,
      parentId: task.parentId,
      createdById: task.createdById,
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      estimatedHours:
        task.estimatedHours !== null && task.estimatedHours !== undefined
          ? task.estimatedHours.toString()
          : null,
      trackedSeconds: task.trackedSeconds,
      subtaskCount: task.subtasks.length,
      completedSubtaskCount: task.subtasks.filter((subtask) => subtask.isCompleted).length,
      isArchived: task.isArchived,
      isCompleted: task.isCompleted,
      completedAt: task.completedAt ? task.completedAt.toISOString() : null,
      position: task.position,
      assignees: task.assignees.map((a) => ({
        id: a.id,
        userId: a.userId,
        email: a.email,
        fullName: a.fullName,
        avatarKey: a.avatarKey,
      })),
      labels: task.labels.map((l) => ({
        id: l.id,
        labelId: l.labelId,
        name: l.name,
        color: l.color,
      })),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    }
  }

  private toLabelDto(label: Label, taskCount: number): LabelDto {
    return {
      id: label.id,
      orgId: label.orgId,
      name: label.name,
      color: label.color,
      taskCount,
      createdAt: label.createdAt.toISOString(),
    }
  }

  private emitTaskEvent(
    event: 'task.created' | 'task.updated' | 'task.deleted' | 'task.moved',
    task: TaskDto,
    actorId: string,
    reason?: string,
  ): void {
    const payload: ProjectRealtimeEvent = {
      projectId: task.projectId,
      actorId,
      entityId: task.id,
      taskId: task.id,
      reason,
    }
    this.deps.realtime?.emitToProject(task.projectId, event, payload)
  }
}
