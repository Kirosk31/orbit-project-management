import { describe, expect, it, vi } from 'vitest'
import type { User as UserRow, UserPreference } from '@prisma/client'
import sharp from 'sharp'
import { isAppError } from '../src/core/errors/index.js'
import { createLogger } from '../src/core/logger/logger.js'
import { UsersService } from '../src/modules/users/users.service.js'
import type { UsersRepository } from '../src/modules/users/users.repository.js'
import type { StorageService } from '../src/shared/storage/storage.js'

function makeUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: 'user-1',
    email: 'ada@orbit.app',
    passwordHash: 'hash',
    fullName: 'Ada Lovelace',
    bio: null,
    avatarKey: null,
    isEmailVerified: true,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  }
}

function makePreference(overrides: Partial<UserPreference> = {}): UserPreference {
  return {
    userId: 'user-1',
    theme: 'dark',
    locale: 'es',
    digestSummaries: true,
    emailNotifications: false,
    weeklyReport: true,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

function createFakeRepository(): {
  repository: UsersRepository
  calls: {
    updateProfile: Array<{ id: string; data: { fullName: string; bio: string } }>
    upsertPreferences: Array<{ userId: string; data: Record<string, unknown> }>
    setAvatarKey: Array<{ userId: string; key: string }>
    clearedAvatarKeys: string[]
  }
} {
  const calls = {
    updateProfile: [] as Array<{ id: string; data: { fullName: string; bio: string } }>,
    upsertPreferences: [] as Array<{ userId: string; data: Record<string, unknown> }>,
    setAvatarKey: [] as Array<{ userId: string; key: string }>,
    clearedAvatarKeys: [] as string[],
  }

  const repository: UsersRepository = {
    findById: vi.fn(async () => makeUser()),
    updateProfile: vi.fn(async (id, data) => {
      calls.updateProfile.push({ id, data })
      return makeUser({ fullName: data.fullName, bio: data.bio === '' ? null : data.bio })
    }),
    getAvatarKey: vi.fn(async () => null),
    setAvatarKey: vi.fn(async (userId, key) => {
      calls.setAvatarKey.push({ userId, key })
      return makeUser({ avatarKey: key })
    }),
    clearAvatarKey: vi.fn(async (userId) => {
      calls.clearedAvatarKeys.push(userId)
      return makeUser({ avatarKey: null })
    }),
    findAccessibleAvatarKey: vi.fn(async () => null),
    findPreferences: vi.fn(async () => null),
    upsertPreferences: vi.fn(async (userId, data) => {
      calls.upsertPreferences.push({ userId, data })
    }),
    searchUsers: vi.fn(async () => ({
      items: [makeUser({ id: 'user-2', fullName: 'Grace Hopper', email: 'grace@orbit.app' })],
      total: 1,
    })),
  }

  return { repository, calls }
}

function createStorage(): {
  storage: StorageService
  stored: Array<{ key: string; mimeType: string }>
  deleted: string[]
} {
  const stored: Array<{ key: string; mimeType: string }> = []
  const deleted: string[] = []
  const storage: StorageService = {
    put: vi.fn(async (key, _data, options) => {
      stored.push({ key, mimeType: options.mimeType })
      return { key, size: 0, mimeType: options.mimeType }
    }),
    get: vi.fn(async () => Buffer.alloc(0)),
    delete: vi.fn(async (key) => {
      deleted.push(key)
    }),
    exists: vi.fn(async () => true),
  }
  return { storage, stored, deleted }
}

function createService(): {
  service: UsersService
  repository: UsersRepository
  calls: ReturnType<typeof createFakeRepository>['calls']
  stored: Array<{ key: string; mimeType: string }>
  deleted: string[]
} {
  const { repository, calls } = createFakeRepository()
  const { storage, stored, deleted } = createStorage()
  const logger = createLogger({ level: 'silent', isProduction: false })
  const service = new UsersService({ repository, storage, logger })
  return { service, repository, calls, stored, deleted }
}

async function createImage(
  format: 'jpeg' | 'png' | 'webp',
  width = 4,
  height = 4,
): Promise<Buffer> {
  const image = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: '#14283c',
    },
  })

  return image.toFormat(format).toBuffer()
}

describe('UsersService', () => {
  describe('updateProfile', () => {
    it('persists the profile and returns the updated user', async () => {
      const { service, calls } = createService()

      const user = await service.updateProfile('user-1', {
        fullName: 'Ada K. Lovelace',
        bio: 'Analytical engine pioneer',
      })

      expect(calls.updateProfile).toEqual([
        { id: 'user-1', data: { fullName: 'Ada K. Lovelace', bio: 'Analytical engine pioneer' } },
      ])
      expect(user).toMatchObject({
        id: 'user-1',
        fullName: 'Ada K. Lovelace',
        bio: 'Analytical engine pioneer',
        avatarKey: null,
      })
    })

    it('maps an empty bio to null', async () => {
      const { service, calls } = createService()

      await service.updateProfile('user-1', { fullName: 'Ada', bio: '' })

      expect(calls.updateProfile[0]).toBeDefined()
      expect(calls.updateProfile[0]!.data.bio).toBe('')
    })
  })

  describe('uploadAvatar', () => {
    it('stores the file and updates the avatarKey', async () => {
      const { service, stored } = createService()

      const user = await service.uploadAvatar('user-1', {
        buffer: await createImage('jpeg'),
        mimeType: 'image/jpeg',
      })

      expect(stored).toHaveLength(1)
      expect(stored[0]).toMatchObject({
        key: expect.stringMatching(/^avatars\/user-1\/.+/),
        mimeType: 'image/jpeg',
      })
      expect(user.avatarKey).toBe(stored[0]!.key)
    })

    it('rejects unsupported image types', async () => {
      const { service } = createService()

      const promise = service.uploadAvatar('user-1', {
        buffer: Buffer.from('x'),
        mimeType: 'image/gif',
      })

      await expect(promise).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    })

    it('rejects content that does not match the declared media type', async () => {
      const { service } = createService()

      const promise = service.uploadAvatar('user-1', {
        buffer: await createImage('png'),
        mimeType: 'image/jpeg',
      })

      await expect(promise).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    })

    it('rejects oversized files', async () => {
      const { service } = createService()

      const promise = service.uploadAvatar('user-1', {
        buffer: Buffer.concat([
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          Buffer.alloc(3 * 1024 * 1024),
        ]),
        mimeType: 'image/png',
      })

      await expect(promise).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    })

    it('rejects a truncated file with a valid-looking signature', async () => {
      const { service } = createService()

      const promise = service.uploadAvatar('user-1', {
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
        mimeType: 'image/jpeg',
      })

      await expect(promise).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    })

    it('rejects images whose dimensions exceed the safe limit', async () => {
      const { service } = createService()

      const promise = service.uploadAvatar('user-1', {
        buffer: await createImage('png', 4_097, 1),
        mimeType: 'image/png',
      })

      await expect(promise).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    })

    it('deletes the previous avatar when replacing', async () => {
      const repository = createFakeRepository()
      repository.repository.getAvatarKey = vi.fn(async () => 'avatars/user-1/old.png')
      const { storage, deleted } = createStorage()
      const service = new UsersService({
        repository: repository.repository,
        storage,
        logger: createLogger({ level: 'silent', isProduction: false }),
      })

      await service.uploadAvatar('user-1', {
        buffer: await createImage('png'),
        mimeType: 'image/png',
      })

      expect(deleted).toEqual(['avatars/user-1/old.png'])
    })
  })

  describe('deleteAvatar', () => {
    it('removes the stored file and clears the avatarKey', async () => {
      const repository = createFakeRepository()
      repository.repository.getAvatarKey = vi.fn(async () => 'avatars/user-1/a.png')
      const { storage, deleted } = createStorage()
      const service = new UsersService({
        repository: repository.repository,
        storage,
        logger: createLogger({ level: 'silent', isProduction: false }),
      })

      const user = await service.deleteAvatar('user-1')

      expect(deleted).toEqual(['avatars/user-1/a.png'])
      expect(user.avatarKey).toBeNull()
    })

    it('succeeds when no avatar exists', async () => {
      const { service } = createService()

      const user = await service.deleteAvatar('user-1')

      expect(user.avatarKey).toBeNull()
    })
  })

  describe('getAuthorizedAvatar', () => {
    it('returns an authorized stored avatar with a controlled media type', async () => {
      const { repository, service } = createService()
      repository.findAccessibleAvatarKey = vi.fn(async () => 'avatars/user-1/avatar.png')

      const avatar = await service.getAuthorizedAvatar('user-1', 'user-1')

      expect(avatar).toEqual({ buffer: Buffer.alloc(0), mimeType: 'image/png' })
      expect(repository.findAccessibleAvatarKey).toHaveBeenCalledWith('user-1', 'user-1')
    })

    it('does not reveal inaccessible avatars', async () => {
      const { service } = createService()

      await expect(service.getAuthorizedAvatar('outsider', 'user-1')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    })
  })

  describe('preferences', () => {
    it('returns defaults when nothing is stored', async () => {
      const { service } = createService()

      const preferences = await service.getPreferences('user-1')

      expect(preferences).toEqual({
        theme: 'system',
        locale: 'en',
        digestSummaries: true,
        emailNotifications: true,
        weeklyReport: false,
      })
    })

    it('returns stored values', async () => {
      const { repository, service } = createService()
      repository.findPreferences = vi.fn(async () => makePreference())

      const preferences = await service.getPreferences('user-1')

      expect(preferences).toEqual({
        theme: 'dark',
        locale: 'es',
        digestSummaries: true,
        emailNotifications: false,
        weeklyReport: true,
      })
    })

    it('upserts a partial patch and returns the merged result', async () => {
      const { service, calls, repository } = createService()
      repository.findPreferences = vi.fn(async () =>
        makePreference({
          theme: 'dark',
          locale: 'en',
          digestSummaries: true,
          emailNotifications: true,
          weeklyReport: false,
        }),
      )

      const preferences = await service.updatePreferences('user-1', { theme: 'dark' })

      expect(calls.upsertPreferences).toEqual([{ userId: 'user-1', data: { theme: 'dark' } }])
      expect(preferences).toEqual({
        theme: 'dark',
        locale: 'en',
        digestSummaries: true,
        emailNotifications: true,
        weeklyReport: false,
      })
    })
  })

  describe('searchUsers', () => {
    it('returns paginated results with metadata', async () => {
      const { service } = createService()

      const result = await service.searchUsers('user-1', {
        orgId: 'org-1',
        q: 'grace',
        page: 1,
        pageSize: 20,
      })

      expect(result.items).toHaveLength(1)
      expect(result.items[0]).toMatchObject({ id: 'user-2', fullName: 'Grace Hopper' })
      expect(result.meta).toMatchObject({ page: 1, pageSize: 20, total: 1, totalPages: 1 })
    })

    it('excludes the caller from results', async () => {
      const { service, repository } = createService()

      await service.searchUsers('user-1', {
        orgId: 'org-1',
        q: 'grace',
        page: 1,
        pageSize: 20,
      })

      expect(repository.searchUsers).toHaveBeenCalledWith({
        q: 'grace',
        orgId: 'org-1',
        excludeUserId: 'user-1',
        skip: 0,
        take: 20,
      })
    })

    it('computes skip from the page number', async () => {
      const { service, repository } = createService()

      await service.searchUsers('user-1', {
        orgId: 'org-1',
        q: 'grace',
        page: 3,
        pageSize: 10,
      })

      expect(repository.searchUsers).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      )
    })
  })
})

describe('UsersService error behavior', () => {
  it('propagates AppError instances untouched', async () => {
    const { repository, service } = createService()
    const expectedError = Object.assign(new Error('boom'), { code: 'NOT_FOUND', statusCode: 404 })
    repository.getAvatarKey = vi.fn(async () => {
      throw expectedError
    })

    const promise = service.deleteAvatar('user-1')

    await expect(promise).rejects.toThrow(expectedError)
    expect(isAppError(expectedError)).toBe(false)
  })
})
