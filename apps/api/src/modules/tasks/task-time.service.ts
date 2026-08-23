import { Prisma } from '@prisma/client'
import type {
  LogTimeEntryDto,
  PaginationQuery,
  StartTaskTimerDto,
  TimeEntryDto,
  TimeEntryListDto,
  UpdateTimeEntryDto,
  ProjectRealtimeEvent,
} from '@orbit/shared'
import { badRequest, conflict, notFound } from '../../core/errors/index.js'
import type { TasksRepository } from './tasks.repository.js'
import type { TaskTimeRepository, TimeEntryRow } from './task-time.repository.js'
import type { RealtimePublisher } from '../realtime/realtime.publisher.js'

const FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1_000

export interface TaskTimeServiceDependencies {
  repository: TaskTimeRepository
  tasks: TasksRepository
  realtime?: RealtimePublisher
}

export class TaskTimeService {
  constructor(private readonly deps: TaskTimeServiceDependencies) {}

  async list(taskId: string, query: PaginationQuery): Promise<TimeEntryListDto> {
    const { rows, total } = await this.deps.repository.list(
      taskId,
      (query.page - 1) * query.pageSize,
      query.pageSize,
    )
    return { rows: rows.map((row) => this.toDto(row)), total }
  }

  async log(
    taskId: string,
    actorId: string,
    dto: LogTimeEntryDto,
    now = new Date(),
  ): Promise<TimeEntryDto> {
    const durationSeconds = dto.durationMinutes * 60
    const startedAt = dto.startedAt ?? new Date(now.getTime() - durationSeconds * 1_000)
    const endedAt = new Date(startedAt.getTime() + durationSeconds * 1_000)
    if (startedAt.getTime() > now.getTime() + FUTURE_CLOCK_SKEW_MS) {
      throw badRequest('Time entry cannot start in the future')
    }
    if (endedAt.getTime() > now.getTime() + FUTURE_CLOCK_SKEW_MS) {
      throw badRequest('Time entry cannot end in the future')
    }

    const entry = await this.deps.repository.createManual({
      taskId,
      userId: actorId,
      startedAt,
      endedAt,
      durationSeconds,
      note: dto.note ?? null,
    })
    await this.recordActivity(taskId, actorId, 'task.time_logged', entry.id, durationSeconds)
    return this.toDto(entry)
  }

  async startTimer(
    taskId: string,
    actorId: string,
    dto: StartTaskTimerDto,
    now = new Date(),
  ): Promise<TimeEntryDto> {
    if (await this.deps.repository.findActiveByUser(actorId)) {
      throw conflict('You already have a running timer')
    }

    try {
      const entry = await this.deps.repository.start({
        taskId,
        userId: actorId,
        startedAt: now,
        note: dto.note ?? null,
      })
      await this.recordActivity(taskId, actorId, 'task.timer_started', entry.id, 0)
      return this.toDto(entry)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw conflict('You already have a running timer')
      }
      throw error
    }
  }

  async stopTimer(taskId: string, actorId: string, now = new Date()): Promise<TimeEntryDto> {
    const active = await this.deps.repository.findActiveByUser(actorId)
    if (!active || active.taskId !== taskId) {
      throw notFound('No running timer found for this task')
    }

    const entry = await this.deps.repository.stop(active.id, now)
    if (!entry) throw conflict('Timer has already been stopped')
    await this.recordActivity(
      taskId,
      actorId,
      'task.timer_stopped',
      entry.id,
      entry.durationSeconds,
    )
    return this.toDto(entry)
  }

  async update(
    taskId: string,
    entryId: string,
    actorId: string,
    dto: UpdateTimeEntryDto,
  ): Promise<TimeEntryDto> {
    const existing = await this.find(taskId, entryId)
    if (!existing.endedAt) {
      throw badRequest('Stop the timer before editing its time entry')
    }
    const entry = await this.deps.repository.updateCompleted(entryId, {
      ...(dto.durationMinutes === undefined ? {} : { durationSeconds: dto.durationMinutes * 60 }),
      ...(dto.note === undefined ? {} : { note: dto.note }),
    })
    if (!entry) throw conflict('Time entry changed while it was being updated')
    await this.recordActivity(
      taskId,
      actorId,
      'task.time_entry_updated',
      entry.id,
      entry.durationSeconds,
    )
    return this.toDto(entry)
  }

  async remove(taskId: string, entryId: string, actorId: string): Promise<void> {
    await this.find(taskId, entryId)
    const removed = await this.deps.repository.delete(entryId)
    if (!removed || removed.taskId !== taskId) throw notFound('Time entry not found')
    await this.recordActivity(
      taskId,
      actorId,
      'task.time_entry_deleted',
      entryId,
      removed.durationSeconds,
    )
  }

  private async find(taskId: string, entryId: string): Promise<TimeEntryRow> {
    const entry = await this.deps.repository.find(taskId, entryId)
    if (!entry) throw notFound('Time entry not found')
    return entry
  }

  private async recordActivity(
    taskId: string,
    actorId: string,
    action: string,
    entityId: string,
    durationSeconds: number,
  ): Promise<void> {
    await this.deps.tasks.recordTaskActivity({
      taskId,
      actorId,
      action,
      entityType: 'TIME_ENTRY',
      entityId,
      metadata: { durationSeconds },
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

  private toDto(entry: TimeEntryRow): TimeEntryDto {
    return {
      id: entry.id,
      taskId: entry.taskId,
      userId: entry.userId,
      userName: entry.user.fullName,
      userAvatarKey: entry.user.avatarKey,
      startedAt: entry.startedAt.toISOString(),
      endedAt: entry.endedAt?.toISOString() ?? null,
      durationSeconds: entry.durationSeconds,
      note: entry.note,
      isRunning: entry.endedAt === null,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    }
  }
}
