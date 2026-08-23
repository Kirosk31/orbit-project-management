import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createLogger } from '../../core/logger/logger.js'
import { LocalStorageService } from './storage.js'

describe('LocalStorageService', () => {
  let rootDir: string
  let storage: LocalStorageService

  beforeEach(async () => {
    rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'orbit-storage-'))
    storage = new LocalStorageService(
      rootDir,
      createLogger({ level: 'silent', isProduction: false }),
    )
  })

  afterEach(async () => {
    await fs.rm(rootDir, { recursive: true, force: true })
  })

  it('stores and retrieves an opaque relative key inside the configured root', async () => {
    const data = Buffer.from('safe content')

    await storage.put('avatars/user-id/file.png', data, { mimeType: 'image/png' })

    await expect(storage.get('avatars/user-id/file.png')).resolves.toEqual(data)
    await expect(storage.exists('avatars/user-id/file.png')).resolves.toBe(true)
  })

  it.each(['../outside.txt', '..\\outside.txt', '/absolute.txt', 'C:\\absolute.txt'])(
    'rejects a key outside the configured root: %s',
    async (key) => {
      await expect(
        storage.put(key, Buffer.from('unsafe'), { mimeType: 'text/plain' }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    },
  )

  it('treats deletion of a missing file as idempotent', async () => {
    await expect(storage.delete('avatars/user-id/missing.png')).resolves.toBeUndefined()
  })

  it('does not hide an invalid key behind a false existence result', async () => {
    await expect(storage.exists('../outside.txt')).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })
})
