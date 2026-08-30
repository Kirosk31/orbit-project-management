import type { OutboxEvent, Prisma, PrismaClient } from '@prisma/client'
import type { PreparedOutboxEvent } from './outbox.crypto.js'

export type OutboxTransaction = Prisma.TransactionClient

export async function insertOutboxEvent(
  transaction: OutboxTransaction,
  event: PreparedOutboxEvent,
): Promise<void> {
  await transaction.outboxEvent.create({
    data: {
      type: event.type,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      payloadCiphertext: event.payloadCiphertext,
      payloadIv: event.payloadIv,
      payloadAuthTag: event.payloadAuthTag,
      maxAttempts: event.maxAttempts,
    },
  })
}

export class PrismaOutboxRepository {
  constructor(private readonly prisma: PrismaClient) {}

  enqueue(event: PreparedOutboxEvent): Promise<OutboxEvent> {
    return this.prisma.outboxEvent.create({ data: event })
  }

  claimBatch(input: {
    workerId: string
    batchSize: number
    lockTimeoutSeconds: number
  }): Promise<OutboxEvent[]> {
    const staleBefore = new Date(Date.now() - input.lockTimeoutSeconds * 1_000)
    return this.prisma.$queryRaw<OutboxEvent[]>`
      WITH exhausted AS (
        UPDATE "outbox_events"
        SET "status" = 'FAILED',
            "lockedAt" = NULL,
            "lockedBy" = NULL,
            "lastError" = 'Worker lease expired after final attempt',
            "updatedAt" = clock_timestamp()
        WHERE "status" = 'PROCESSING'
          AND "lockedAt" < ${staleBefore}
          AND "attempts" >= "maxAttempts"
        RETURNING "id"
      ), candidates AS MATERIALIZED (
        SELECT "id"
        FROM "outbox_events"
        WHERE "attempts" < "maxAttempts"
          AND (
            ("status" = 'PENDING' AND "availableAt" <= clock_timestamp())
            OR ("status" = 'PROCESSING' AND "lockedAt" < ${staleBefore})
          )
        ORDER BY "availableAt" ASC, "createdAt" ASC
        LIMIT ${input.batchSize}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "outbox_events" AS event
      SET "status" = 'PROCESSING',
          "lockedAt" = clock_timestamp(),
          "lockedBy" = ${input.workerId},
          "attempts" = event."attempts" + 1,
          "updatedAt" = clock_timestamp()
      FROM candidates
      WHERE event."id" = candidates."id"
      RETURNING event.*
    `
  }

  async markCompleted(id: string, workerId: string): Promise<boolean> {
    const result = await this.prisma.outboxEvent.updateMany({
      where: { id, status: 'PROCESSING', lockedBy: workerId },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        lastError: null,
      },
    })
    return result.count === 1
  }

  async markDeliveryFailed(input: {
    event: OutboxEvent
    workerId: string
    retryAt: Date
  }): Promise<boolean> {
    const terminal = input.event.attempts >= input.event.maxAttempts
    const result = await this.prisma.outboxEvent.updateMany({
      where: { id: input.event.id, status: 'PROCESSING', lockedBy: input.workerId },
      data: {
        status: terminal ? 'FAILED' : 'PENDING',
        availableAt: input.retryAt,
        lockedAt: null,
        lockedBy: null,
        lastError: 'Delivery attempt failed',
      },
    })
    return result.count === 1
  }
}
