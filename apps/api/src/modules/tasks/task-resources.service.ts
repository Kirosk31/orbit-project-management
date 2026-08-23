import type {
  ChecklistDto,
  CreateChecklistDto,
  CreateChecklistItemDto,
  MoveChecklistItemDto,
  UpdateChecklistDto,
  UpdateChecklistItemDto,
  ProjectRealtimeEvent,
} from '@orbit/shared'
import { notFound } from '../../core/errors/index.js'
import type { TasksRepository } from './tasks.repository.js'
import type { ChecklistRow, TaskResourcesRepository } from './task-resources.repository.js'
import type { RealtimePublisher } from '../realtime/realtime.publisher.js'

export interface TaskResourcesServiceDependencies {
  repository: TaskResourcesRepository
  tasks: TasksRepository
  realtime?: RealtimePublisher
}

export class TaskResourcesService {
  constructor(private readonly deps: TaskResourcesServiceDependencies) {}

  async listChecklists(taskId: string): Promise<ChecklistDto[]> {
    return (await this.deps.repository.listChecklists(taskId)).map((row) =>
      this.toChecklistDto(row),
    )
  }

  async createChecklist(
    taskId: string,
    actorId: string,
    dto: CreateChecklistDto,
  ): Promise<ChecklistDto> {
    const checklist = await this.deps.repository.createChecklist(taskId, dto.title)
    await this.recordActivity(taskId, actorId, 'task.checklist_created', checklist.id)
    return this.requireChecklist(taskId, checklist.id)
  }

  async updateChecklist(
    taskId: string,
    checklistId: string,
    actorId: string,
    dto: UpdateChecklistDto,
  ): Promise<ChecklistDto> {
    await this.findChecklist(taskId, checklistId)
    await this.deps.repository.updateChecklist(checklistId, dto.title!)
    await this.recordActivity(taskId, actorId, 'task.checklist_updated', checklistId)
    return this.requireChecklist(taskId, checklistId)
  }

  async deleteChecklist(taskId: string, checklistId: string, actorId: string): Promise<void> {
    await this.findChecklist(taskId, checklistId)
    await this.deps.repository.deleteChecklist(checklistId)
    await this.recordActivity(taskId, actorId, 'task.checklist_deleted', checklistId)
  }

  async createChecklistItem(
    taskId: string,
    checklistId: string,
    actorId: string,
    dto: CreateChecklistItemDto,
  ): Promise<ChecklistDto> {
    await this.findChecklist(taskId, checklistId)
    const item = await this.deps.repository.createChecklistItem(checklistId, dto.title)
    await this.recordActivity(taskId, actorId, 'task.checklist_item_created', item.id)
    return this.requireChecklist(taskId, checklistId)
  }

  async updateChecklistItem(
    taskId: string,
    checklistId: string,
    itemId: string,
    actorId: string,
    dto: UpdateChecklistItemDto,
  ): Promise<ChecklistDto> {
    await this.findChecklistItem(taskId, checklistId, itemId)
    await this.deps.repository.updateChecklistItem(itemId, dto)
    await this.recordActivity(taskId, actorId, 'task.checklist_item_updated', itemId)
    return this.requireChecklist(taskId, checklistId)
  }

  async deleteChecklistItem(
    taskId: string,
    checklistId: string,
    itemId: string,
    actorId: string,
  ): Promise<ChecklistDto> {
    await this.findChecklistItem(taskId, checklistId, itemId)
    await this.deps.repository.deleteChecklistItem(checklistId, itemId)
    await this.recordActivity(taskId, actorId, 'task.checklist_item_deleted', itemId)
    return this.requireChecklist(taskId, checklistId)
  }

  async moveChecklistItem(
    taskId: string,
    checklistId: string,
    itemId: string,
    actorId: string,
    dto: MoveChecklistItemDto,
  ): Promise<ChecklistDto> {
    await this.findChecklistItem(taskId, checklistId, itemId)
    await this.deps.repository.moveChecklistItem(checklistId, itemId, dto.toPosition)
    await this.recordActivity(taskId, actorId, 'task.checklist_item_moved', itemId)
    return this.requireChecklist(taskId, checklistId)
  }

  private async findChecklist(taskId: string, checklistId: string): Promise<ChecklistRow> {
    const checklist = await this.deps.repository.findChecklist(taskId, checklistId)
    if (!checklist) {
      throw notFound('Checklist not found')
    }
    return checklist
  }

  private async requireChecklist(taskId: string, checklistId: string): Promise<ChecklistDto> {
    return this.toChecklistDto(await this.findChecklist(taskId, checklistId))
  }

  private async findChecklistItem(
    taskId: string,
    checklistId: string,
    itemId: string,
  ): Promise<void> {
    if (!(await this.deps.repository.findChecklistItem(taskId, checklistId, itemId))) {
      throw notFound('Checklist item not found')
    }
  }

  private async recordActivity(
    taskId: string,
    actorId: string,
    action: string,
    entityId: string,
  ): Promise<void> {
    await this.deps.tasks.recordTaskActivity({
      taskId,
      actorId,
      action,
      entityType: 'CHECKLIST',
      entityId,
    })
    const task = await this.deps.tasks.findTaskById(taskId)
    if (task) {
      const payload: ProjectRealtimeEvent = {
        projectId: task.projectId,
        taskId,
        actorId,
        entityId: taskId,
        reason: action,
      }
      this.deps.realtime?.emitToProject(task.projectId, 'task.updated', payload)
    }
  }

  private toChecklistDto(checklist: ChecklistRow): ChecklistDto {
    const items = checklist.items.map((item) => ({
      id: item.id,
      checklistId: item.checklistId,
      title: item.title,
      isCompleted: item.isCompleted,
      position: item.position,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }))
    return {
      id: checklist.id,
      taskId: checklist.taskId,
      title: checklist.title,
      position: checklist.position,
      items,
      completedItems: items.filter((item) => item.isCompleted).length,
      totalItems: items.length,
      createdAt: checklist.createdAt.toISOString(),
      updatedAt: checklist.updatedAt.toISOString(),
    }
  }
}
