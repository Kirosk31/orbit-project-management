import type { Checklist, ChecklistItem, Prisma, PrismaClient } from '@prisma/client'

const CHECKLIST_INCLUDE = {
  items: { orderBy: [{ position: 'asc' as const }, { createdAt: 'asc' as const }] },
} satisfies Prisma.ChecklistInclude

export type ChecklistRow = Prisma.ChecklistGetPayload<{ include: typeof CHECKLIST_INCLUDE }>

export interface TaskResourcesRepository {
  listChecklists(taskId: string): Promise<ChecklistRow[]>
  findChecklist(taskId: string, checklistId: string): Promise<ChecklistRow | null>
  createChecklist(taskId: string, title: string): Promise<Checklist>
  updateChecklist(checklistId: string, title: string): Promise<Checklist>
  deleteChecklist(checklistId: string): Promise<void>
  findChecklistItem(
    taskId: string,
    checklistId: string,
    itemId: string,
  ): Promise<ChecklistItem | null>
  createChecklistItem(checklistId: string, title: string): Promise<ChecklistItem>
  updateChecklistItem(
    itemId: string,
    data: { title?: string; isCompleted?: boolean },
  ): Promise<ChecklistItem>
  deleteChecklistItem(checklistId: string, itemId: string): Promise<void>
  moveChecklistItem(checklistId: string, itemId: string, toPosition: number): Promise<void>
}

export class PrismaTaskResourcesRepository implements TaskResourcesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listChecklists(taskId: string): Promise<ChecklistRow[]> {
    return this.prisma.checklist.findMany({
      where: { taskId },
      include: CHECKLIST_INCLUDE,
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    })
  }

  findChecklist(taskId: string, checklistId: string): Promise<ChecklistRow | null> {
    return this.prisma.checklist.findFirst({
      where: { id: checklistId, taskId },
      include: CHECKLIST_INCLUDE,
    })
  }

  async createChecklist(taskId: string, title: string): Promise<Checklist> {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.checklist.count({ where: { taskId } })
      return tx.checklist.create({ data: { taskId, title, position: count } })
    })
  }

  updateChecklist(checklistId: string, title: string): Promise<Checklist> {
    return this.prisma.checklist.update({ where: { id: checklistId }, data: { title } })
  }

  async deleteChecklist(checklistId: string): Promise<void> {
    await this.prisma.checklist.delete({ where: { id: checklistId } })
  }

  findChecklistItem(
    taskId: string,
    checklistId: string,
    itemId: string,
  ): Promise<ChecklistItem | null> {
    return this.prisma.checklistItem.findFirst({
      where: { id: itemId, checklistId, checklist: { taskId } },
    })
  }

  async createChecklistItem(checklistId: string, title: string): Promise<ChecklistItem> {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.checklistItem.count({ where: { checklistId } })
      return tx.checklistItem.create({ data: { checklistId, title, position: count } })
    })
  }

  updateChecklistItem(
    itemId: string,
    data: { title?: string; isCompleted?: boolean },
  ): Promise<ChecklistItem> {
    return this.prisma.checklistItem.update({ where: { id: itemId }, data })
  }

  async deleteChecklistItem(checklistId: string, itemId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.checklistItem.delete({ where: { id: itemId } })
      const remaining = await tx.checklistItem.findMany({
        where: { checklistId },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      })
      for (let position = 0; position < remaining.length; position += 1) {
        await tx.checklistItem.update({
          where: { id: remaining[position]!.id },
          data: { position },
        })
      }
    })
  }

  async moveChecklistItem(checklistId: string, itemId: string, toPosition: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const siblings = await tx.checklistItem.findMany({
        where: { checklistId, id: { not: itemId } },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      })
      const clamped = Math.max(0, Math.min(toPosition, siblings.length))
      const ordered = [
        ...siblings.slice(0, clamped).map((item) => item.id),
        itemId,
        ...siblings.slice(clamped).map((item) => item.id),
      ]
      for (let position = 0; position < ordered.length; position += 1) {
        await tx.checklistItem.update({
          where: { id: ordered[position]! },
          data: { position },
        })
      }
    })
  }
}
