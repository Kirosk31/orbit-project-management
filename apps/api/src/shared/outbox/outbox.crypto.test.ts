import { describe, expect, it } from 'vitest'
import { OutboxEventCodec } from './outbox.crypto.js'

const KEY = Buffer.alloc(32, 7).toString('base64url')

describe('OutboxEventCodec', () => {
  it('encrypts and authenticates email payloads', () => {
    const codec = new OutboxEventCodec(KEY, 'unused-development-fallback', 8)
    const email = {
      to: { address: 'person@example.com', name: 'Test Person' },
      subject: 'Private message',
      html: '<a href="https://app.example.com/reset?token=secret-token">Reset</a>',
    }

    const event = codec.prepareEmail(email, { type: 'USER', id: 'user-1' })

    expect(event.payloadCiphertext).not.toContain('person@example.com')
    expect(event.payloadCiphertext).not.toContain('secret-token')
    expect(codec.decodeEmail(event)).toEqual(email)
  })

  it('rejects payload tampering', () => {
    const codec = new OutboxEventCodec(KEY, 'unused-development-fallback', 8)
    const event = codec.prepareEmail({
      to: { address: 'person@example.com' },
      subject: 'Subject',
      text: 'Body',
    })

    expect(() =>
      codec.decodeEmail({ ...event, payloadAuthTag: Buffer.alloc(16).toString('base64url') }),
    ).toThrow()
  })
})
