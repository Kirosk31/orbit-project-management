import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SendMailOptions } from '../src/shared/mail/mail.js'
import { createLogger } from '../src/core/logger/logger.js'
import { OutboxEventCodec } from '../src/shared/outbox/outbox.crypto.js'
import { PrismaOutboxRepository } from '../src/shared/outbox/outbox.repository.js'
import { OutboxWorker } from '../src/shared/outbox/outbox.worker.js'
import { PrismaAuthRepository } from '../src/modules/auth/auth.repository.js'
import { buildTestApp, isTestDatabaseAvailable, type BuiltTestApp } from './testApp.js'

const KEY = Buffer.alloc(32, 9).toString('base64url')
const AGGREGATE_TYPE = 'OUTBOX_TEST'
const dbAvailable = await isTestDatabaseAvailable()
const describeDb = dbAvailable ? describe : describe.skip

describeDb('durable outbox', () => {
  let app: BuiltTestApp
  let repository: PrismaOutboxRepository
  let codec: OutboxEventCodec

  beforeAll(() => {
    app = buildTestApp()
    repository = new PrismaOutboxRepository(app.prisma)
    codec = new OutboxEventCodec(KEY, 'unused-development-fallback', 3)
  })

  beforeEach(async () => {
    await app.prisma.outboxEvent.deleteMany({ where: { aggregateType: AGGREGATE_TYPE } })
  })

  afterAll(async () => {
    await app.prisma.outboxEvent.deleteMany({ where: { aggregateType: AGGREGATE_TYPE } })
    await app.prisma.$disconnect()
  })

  async function enqueue(subject: string) {
    return repository.enqueue(
      codec.prepareEmail(
        { to: { address: 'worker@example.com' }, subject, text: 'Deliver me' },
        { type: AGGREGATE_TYPE, id: randomUUID() },
      ),
    )
  }

  it('claims each event only once across concurrent workers', async () => {
    await Promise.all([enqueue('First'), enqueue('Second')])

    const [firstClaim, secondClaim] = await Promise.all([
      repository.claimBatch({ workerId: 'worker-a', batchSize: 1, lockTimeoutSeconds: 60 }),
      repository.claimBatch({ workerId: 'worker-b', batchSize: 1, lockTimeoutSeconds: 60 }),
    ])

    expect(firstClaim).toHaveLength(1)
    expect(secondClaim).toHaveLength(1)
    expect(firstClaim[0]?.id).not.toBe(secondClaim[0]?.id)
  })

  it('delivers and completes a queued email', async () => {
    const event = await enqueue('Successful delivery')
    const sendMail = vi.fn(async (_options: SendMailOptions) => undefined)
    const worker = new OutboxWorker(
      repository,
      codec,
      { sendMail },
      createLogger({ level: 'silent', isProduction: false }),
      { batchSize: 10, lockTimeoutSeconds: 60 },
    )

    expect(await worker.runOnce()).toBe(1)
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Successful delivery' }),
    )
    await expect(
      app.prisma.outboxEvent.findUnique({ where: { id: event.id } }),
    ).resolves.toMatchObject({ status: 'COMPLETED', attempts: 1, lastError: null })
  })

  it('commits an authentication token and its delivery event atomically', async () => {
    const user = await app.prisma.user.create({
      data: {
        email: `outbox-${randomUUID()}@example.com`,
        fullName: 'Outbox User',
        passwordHash: 'not-used-by-this-test',
      },
    })
    const outboxEvent = codec.prepareEmail(
      { to: { address: user.email }, subject: 'Reset', text: 'Reset link' },
      { type: AGGREGATE_TYPE, id: user.id },
    )

    try {
      await new PrismaAuthRepository(app.prisma).createPasswordResetToken({
        userId: user.id,
        tokenHash: randomUUID(),
        expiresAt: new Date(Date.now() + 60_000),
        outboxEvent,
      })

      const [tokens, events] = await Promise.all([
        app.prisma.passwordResetToken.count({ where: { userId: user.id } }),
        app.prisma.outboxEvent.count({
          where: { aggregateType: AGGREGATE_TYPE, aggregateId: user.id },
        }),
      ])
      expect({ tokens, events }).toEqual({ tokens: 1, events: 1 })
    } finally {
      await app.prisma.outboxEvent.deleteMany({ where: { aggregateId: user.id } })
      await app.prisma.user.delete({ where: { id: user.id } })
    }
  })

  it('retries without persisting provider error details', async () => {
    const event = await enqueue('Failed delivery')
    const worker = new OutboxWorker(
      repository,
      codec,
      { sendMail: vi.fn(async () => Promise.reject(new Error('SMTP secret details'))) },
      createLogger({ level: 'silent', isProduction: false }),
      { batchSize: 10, lockTimeoutSeconds: 60 },
    )

    expect(await worker.runOnce()).toBe(1)
    const stored = await app.prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } })
    expect(stored).toMatchObject({
      status: 'PENDING',
      attempts: 1,
      lastError: 'Delivery attempt failed',
    })
    expect(stored.lastError).not.toContain('secret')
    expect(stored.availableAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('recovers stale leases and dead-letters exhausted work', async () => {
    const recoverable = await enqueue('Recoverable lease')
    const exhausted = await enqueue('Exhausted lease')
    const staleLock = new Date(Date.now() - 120_000)
    await Promise.all([
      app.prisma.outboxEvent.update({
        where: { id: recoverable.id },
        data: { status: 'PROCESSING', attempts: 1, lockedAt: staleLock, lockedBy: 'dead-worker' },
      }),
      app.prisma.outboxEvent.update({
        where: { id: exhausted.id },
        data: { status: 'PROCESSING', attempts: 3, lockedAt: staleLock, lockedBy: 'dead-worker' },
      }),
    ])

    const claimed = await repository.claimBatch({
      workerId: 'recovery-worker',
      batchSize: 10,
      lockTimeoutSeconds: 60,
    })

    expect(claimed.map((event) => event.id)).toEqual([recoverable.id])
    await expect(
      app.prisma.outboxEvent.findUniqueOrThrow({ where: { id: exhausted.id } }),
    ).resolves.toMatchObject({
      status: 'FAILED',
      lockedAt: null,
      lockedBy: null,
      lastError: 'Worker lease expired after final attempt',
    })
  })
})
