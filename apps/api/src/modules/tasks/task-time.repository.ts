import { Prisma, type PrismaClient, type TimeEntry } from '@prisma/client'

const TIME_ENTRY_INCLUDE = {
  user: { select: { id: true, fullName: true, avatarKey: true } },
} satisfies Prisma.TimeEntryInclude

export type TimeEntryRow = Prisma.TimeEntryGetPayload<{ include: typeof TIME_ENTRY_INCLUDE }>

export interface TaskTimeRepository {
  list(taskId: string, skip: number, take: number): Promise<{ rows: TimeEntryRow[]; total: number }>
  find(taskId: string, entryId: string): Promise<TimeEntryRow | null>
  findActiveByUser(userId: string): Promise<TimeEntryRow | null>
  createManual(data: {
    taskId: string
    userId: string
    startedAt: Date
    endedAt: Date
    durationSeconds: number
    note: string | null
  }): Promise<TimeEntryRow>
  start(data: {
    taskId: string
    userId: string
    startedAt: Date
    note: string | null
  }): Promise<TimeEntryRow>
  stop(entryId: string, endedAt: Date): Promise<TimeEntryRow | null>
  updateCompleted(
    entryId: string,
    data: { durationSeconds?: number; note?: string | null },
  ): Promise<TimeEntryRow | null>
  delete(entryId: string): Promise<{ taskId: string; durationSeconds: number } | null>
}

export class PrismaTaskTimeRepository implements TaskTimeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(
    taskId: string,
    skip: number,
    take: number,
  ): Promise<{ rows: TimeEntryRow[]; total: number }> {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.timeEntry.findMany({
        where: { taskId },
        include: TIME_ENTRY_INCLUDE,
        orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.timeEntry.count({ where: { taskId } }),
    ])
    return { rows, total }
  }

  find(taskId: string, entryId: string): Promise<TimeEntryRow | null> {
    return this.prisma.timeEntry.findFirst({
      where: { id: entryId, taskId },
      include: TIME_ENTRY_INCLUDE,
    })
  }

  findActiveByUser(userId: string): Promise<TimeEntryRow | null> {
    return this.prisma.timeEntry.findFirst({
      where: { userId, endedAt: null },
      include: TIME_ENTRY_INCLUDE,
    })
  }

  createManual(data: {
    taskId: string
    userId: string
    startedAt: Date
    endedAt: Date
    durationSeconds: number
    note: string | null
  }): Promise<TimeEntryRow> {
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.timeEntry.create({ data, include: TIME_ENTRY_INCLUDE })
      await tx.task.update({
        where: { id: data.taskId },
        data: { trackedSeconds: { increment: data.durationSeconds } },
      })
      return entry
    })
  }

  start(data: {
    taskId: string
    userId: string
    startedAt: Date
    note: string | null
  }): Promise<TimeEntryRow> {
    return this.prisma.timeEntry.create({
      data: { ...data, durationSeconds: 0 },
      include: TIME_ENTRY_INCLUDE,
    })
  }

  stop(entryId: string, endedAt: Date): Promise<TimeEntryRow | null> {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.lockEntry(tx, entryId)
      if (!current || current.endedAt) return null

      const durationSeconds = Math.max(
        1,
        Math.floor((endedAt.getTime() - current.startedAt.getTime()) / 1_000),
      )
      const entry = await tx.timeEntry.update({
        where: { id: entryId },
        data: { endedAt, durationSeconds },
        include: TIME_ENTRY_INCLUDE,
      })
      await tx.task.update({
        where: { id: current.taskId },
        data: { trackedSeconds: { increment: durationSeconds } },
      })
      return entry
    })
  }

  updateCompleted(
    entryId: string,
    data: { durationSeconds?: number; note?: string | null },
  ): Promise<TimeEntryRow | null> {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.lockEntry(tx, entryId)
      if (!current || !current.endedAt) return null

      const durationSeconds = data.durationSeconds ?? current.durationSeconds
      const endedAt =
        data.durationSeconds === undefined
          ? current.endedAt
          : new Date(current.startedAt.getTime() + durationSeconds * 1_000)
      const entry = await tx.timeEntry.update({
        where: { id: entryId },
        data: { ...data, endedAt },
        include: TIME_ENTRY_INCLUDE,
      })
      const delta = durationSeconds - current.durationSeconds
      if (delta !== 0) {
        await tx.task.update({
          where: { id: current.taskId },
          data: { trackedSeconds: { increment: delta } },
        })
      }
      return entry
    })
  }

  delete(entryId: string): Promise<{ taskId: string; durationSeconds: number } | null> {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.lockEntry(tx, entryId)
      if (!current) return null

      await tx.timeEntry.delete({ where: { id: entryId } })
      if (current.endedAt && current.durationSeconds > 0) {
        await tx.task.update({
          where: { id: current.taskId },
          data: { trackedSeconds: { decrement: current.durationSeconds } },
        })
      }
      return { taskId: current.taskId, durationSeconds: current.durationSeconds }
    })
  }

  private async lockEntry(
    tx: Prisma.TransactionClient,
    entryId: string,
  ): Promise<TimeEntry | null> {
    const rows = await tx.$queryRaw<TimeEntry[]>(
      Prisma.sql`SELECT * FROM "time_entries" WHERE "id" = ${entryId} FOR UPDATE`,
    )
    return rows[0] ?? null
  }
}
