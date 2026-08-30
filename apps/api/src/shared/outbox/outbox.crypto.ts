import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'
import type { SendMailOptions } from '../mail/mail.js'

const MAIL_EVENT_TYPE = 'mail.send.v1'
const AES_ALGORITHM = 'aes-256-gcm'

const mailPayloadSchema = z
  .object({
    to: z.object({ name: z.string().max(200).optional(), address: z.email().max(320) }).strict(),
    subject: z.string().min(1).max(300),
    text: z.string().max(500_000).optional(),
    html: z.string().max(500_000).optional(),
  })
  .strict()

export interface PreparedOutboxEvent {
  type: string
  aggregateType?: string
  aggregateId?: string
  payloadCiphertext: string
  payloadIv: string
  payloadAuthTag: string
  maxAttempts: number
}

export interface EncryptedOutboxRecord {
  type: string
  payloadCiphertext: string
  payloadIv: string
  payloadAuthTag: string
}

function resolveKey(configuredKey: string, developmentFallback: string): Buffer {
  if (configuredKey) {
    const key = Buffer.from(configuredKey, 'base64url')
    if (key.length !== 32) {
      throw new Error(
        'OUTBOX_ENCRYPTION_KEY must contain exactly 32 random bytes in base64url form',
      )
    }
    return key
  }

  return createHash('sha256').update(`orbit-development-outbox:${developmentFallback}`).digest()
}

export class OutboxEventCodec {
  private readonly key: Buffer

  constructor(
    configuredKey: string,
    developmentFallback: string,
    private readonly maxAttempts: number,
  ) {
    this.key = resolveKey(configuredKey, developmentFallback)
  }

  prepareEmail(
    options: SendMailOptions,
    aggregate?: { type: string; id: string },
  ): PreparedOutboxEvent {
    const payload = mailPayloadSchema.parse(options)
    const iv = randomBytes(12)
    const cipher = createCipheriv(AES_ALGORITHM, this.key, iv)
    cipher.setAAD(Buffer.from(MAIL_EVENT_TYPE))
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(payload), 'utf8'),
      cipher.final(),
    ])

    return {
      type: MAIL_EVENT_TYPE,
      aggregateType: aggregate?.type,
      aggregateId: aggregate?.id,
      payloadCiphertext: ciphertext.toString('base64url'),
      payloadIv: iv.toString('base64url'),
      payloadAuthTag: cipher.getAuthTag().toString('base64url'),
      maxAttempts: this.maxAttempts,
    }
  }

  decodeEmail(event: EncryptedOutboxRecord): SendMailOptions {
    if (event.type !== MAIL_EVENT_TYPE) {
      throw new Error(`Unsupported outbox event type: ${event.type}`)
    }

    const decipher = createDecipheriv(
      AES_ALGORITHM,
      this.key,
      Buffer.from(event.payloadIv, 'base64url'),
    )
    decipher.setAAD(Buffer.from(event.type))
    decipher.setAuthTag(Buffer.from(event.payloadAuthTag, 'base64url'))
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(event.payloadCiphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8')

    return mailPayloadSchema.parse(JSON.parse(plaintext) as unknown)
  }
}
