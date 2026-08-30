import { createConfig } from './config/index.js'
import { createLogger } from './core/logger/logger.js'
import { disconnectPrisma, getPrisma } from './shared/database/prisma.js'
import { createMailService } from './shared/mail/mail.js'
import { OutboxEventCodec } from './shared/outbox/outbox.crypto.js'
import { PrismaOutboxRepository } from './shared/outbox/outbox.repository.js'
import { OutboxWorker } from './shared/outbox/outbox.worker.js'

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function bootstrap(): Promise<void> {
  const config = createConfig()
  const logger = createLogger({ level: config.env.LOG_LEVEL, isProduction: config.isProduction })
  const prisma = getPrisma()
  await prisma.$queryRaw`SELECT 1`

  const codec = new OutboxEventCodec(
    config.env.OUTBOX_ENCRYPTION_KEY,
    config.env.JWT_ACCESS_SECRET,
    config.outbox.maxAttempts,
  )
  const worker = new OutboxWorker(
    new PrismaOutboxRepository(prisma),
    codec,
    createMailService(config, logger),
    logger,
    {
      batchSize: config.outbox.batchSize,
      lockTimeoutSeconds: config.outbox.lockTimeoutSeconds,
    },
  )

  let stopping = false
  const stop = (signal: string): void => {
    if (!stopping) {
      stopping = true
      logger.info({ signal, workerId: worker.workerId }, 'stopping outbox worker')
    }
  }
  process.on('SIGINT', () => stop('SIGINT'))
  process.on('SIGTERM', () => stop('SIGTERM'))

  logger.info({ workerId: worker.workerId }, 'outbox worker started')
  while (!stopping) {
    const processed = await worker.runOnce()
    if (processed === 0) {
      await wait(config.outbox.pollIntervalMs)
    }
  }

  await disconnectPrisma()
  logger.info({ workerId: worker.workerId }, 'outbox worker stopped')
}

bootstrap().catch((error: unknown) => {
  const logger = createLogger({ level: 'error', isProduction: false })
  logger.fatal({ error }, 'fatal outbox worker error')
  process.exit(1)
})
