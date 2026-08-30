import { randomUUID } from 'node:crypto'
import type { Logger } from '../../core/logger/logger.js'
import type { MailService } from '../mail/mail.js'
import type { OutboxEventCodec } from './outbox.crypto.js'
import type { PrismaOutboxRepository } from './outbox.repository.js'

export interface OutboxWorkerOptions {
  batchSize: number
  lockTimeoutSeconds: number
}

export class OutboxWorker {
  readonly workerId = randomUUID()

  constructor(
    private readonly repository: PrismaOutboxRepository,
    private readonly codec: OutboxEventCodec,
    private readonly mailService: MailService,
    private readonly logger: Logger,
    private readonly options: OutboxWorkerOptions,
  ) {}

  async runOnce(): Promise<number> {
    const events = await this.repository.claimBatch({
      workerId: this.workerId,
      batchSize: this.options.batchSize,
      lockTimeoutSeconds: this.options.lockTimeoutSeconds,
    })

    await Promise.all(
      events.map(async (event) => {
        try {
          const email = this.codec.decodeEmail(event)
          await this.mailService.sendMail(email)
          await this.repository.markCompleted(event.id, this.workerId)
          this.logger.info({ outboxEventId: event.id, type: event.type }, 'outbox event delivered')
        } catch (error) {
          const retryDelaySeconds = Math.min(3_600, 2 ** Math.min(event.attempts, 10) * 5)
          await this.repository.markDeliveryFailed({
            event,
            workerId: this.workerId,
            retryAt: new Date(Date.now() + retryDelaySeconds * 1_000),
          })
          this.logger.error(
            {
              errorName: error instanceof Error ? error.name : 'UnknownError',
              outboxEventId: event.id,
              type: event.type,
              attempts: event.attempts,
            },
            'outbox delivery failed',
          )
        }
      }),
    )

    return events.length
  }
}
