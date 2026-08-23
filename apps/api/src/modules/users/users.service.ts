import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import {
  buildPaginationMeta,
  toPaginationParams,
  type PaginationMeta,
  type UpdatePreferencesDto,
  type UpdateProfileDto,
  type UserDto,
  type UserPreferencesDto,
  type UserSearchQuery,
  DEFAULT_LOCALE,
  resolveSupportedLocale,
} from '@orbit/shared'
import { badRequest, notFound } from '../../core/errors/index.js'
import type { Logger } from '../../core/logger/logger.js'
import type { StorageService } from '../../shared/storage/storage.js'
import type { UsersRepository } from './users.repository.js'

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_MAX_DIMENSION = 4_096
export const AVATAR_MAX_PIXELS = 16_777_216
export const AVATAR_OUTPUT_DIMENSION = 512
export const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

const AVATAR_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const DEFAULT_PREFERENCES: UserPreferencesDto = {
  theme: 'system',
  locale: 'en',
  digestSummaries: true,
  emailNotifications: true,
  weeklyReport: false,
}

export interface AvatarFile {
  buffer: Buffer
  mimeType: string
}

export interface AuthorizedAvatar {
  buffer: Buffer
  mimeType: (typeof AVATAR_MIME_TYPES)[number]
}

const SHARP_FORMAT_TO_MIME_TYPE: Partial<Record<string, (typeof AVATAR_MIME_TYPES)[number]>> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export interface UsersServiceDependencies {
  repository: UsersRepository
  storage: StorageService
  logger: Logger
}

export class UsersService {
  constructor(private readonly deps: UsersServiceDependencies) {}

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserDto> {
    const user = await this.deps.repository.updateProfile(userId, {
      fullName: dto.fullName,
      bio: dto.bio,
    })
    this.deps.logger.info({ userId }, 'profile updated')
    return this.toUserDto(user)
  }

  async uploadAvatar(userId: string, file: AvatarFile): Promise<UserDto> {
    if (file.buffer.byteLength > AVATAR_MAX_BYTES) {
      throw badRequest('Avatar must be 2 MB or smaller')
    }

    const image = sharp(file.buffer, {
      animated: false,
      limitInputPixels: AVATAR_MAX_PIXELS,
    })

    let metadata: Awaited<ReturnType<typeof image.metadata>>
    try {
      metadata = await image.metadata()
    } catch {
      throw badRequest('Avatar content must be a valid JPEG, PNG or WebP image')
    }

    const detectedMimeType = metadata.format
      ? SHARP_FORMAT_TO_MIME_TYPE[metadata.format]
      : undefined
    const extension = detectedMimeType ? AVATAR_EXTENSIONS[detectedMimeType] : undefined
    if (!extension) {
      throw badRequest('Avatar content must be a valid JPEG, PNG or WebP image')
    }
    if (detectedMimeType !== file.mimeType) {
      throw badRequest('Avatar content does not match its declared media type')
    }
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width > AVATAR_MAX_DIMENSION ||
      metadata.height > AVATAR_MAX_DIMENSION
    ) {
      throw badRequest(`Avatar dimensions must not exceed ${AVATAR_MAX_DIMENSION}px`)
    }
    if ((metadata.pages ?? 1) !== 1) {
      throw badRequest('Animated avatars are not supported')
    }

    let normalizedBuffer: Buffer
    try {
      const normalizedImage = image
        .rotate()
        .resize(AVATAR_OUTPUT_DIMENSION, AVATAR_OUTPUT_DIMENSION, {
          fit: 'cover',
          withoutEnlargement: true,
        })

      normalizedBuffer =
        detectedMimeType === 'image/jpeg'
          ? await normalizedImage.jpeg({ progressive: true, quality: 85 }).toBuffer()
          : detectedMimeType === 'image/png'
            ? await normalizedImage.png({ compressionLevel: 9 }).toBuffer()
            : await normalizedImage.webp({ quality: 85 }).toBuffer()
    } catch {
      throw badRequest('Avatar content must be a decodable image')
    }

    const key = `avatars/${userId}/${randomUUID()}.${extension}`
    await this.deps.storage.put(key, normalizedBuffer, { mimeType: detectedMimeType })

    const previousKey = await this.deps.repository.getAvatarKey(userId)
    const user = await this.deps.repository.setAvatarKey(userId, key)

    if (previousKey && previousKey !== key) {
      void this.deps.storage.delete(previousKey).catch(() => undefined)
    }

    this.deps.logger.info({ userId }, 'avatar uploaded')
    return this.toUserDto(user)
  }

  async deleteAvatar(userId: string): Promise<UserDto> {
    const previousKey = await this.deps.repository.getAvatarKey(userId)
    const user = await this.deps.repository.clearAvatarKey(userId)

    if (previousKey) {
      await this.deps.storage.delete(previousKey)
    }

    this.deps.logger.info({ userId }, 'avatar removed')
    return this.toUserDto(user)
  }

  async getAuthorizedAvatar(requesterId: string, targetUserId: string): Promise<AuthorizedAvatar> {
    const key = await this.deps.repository.findAccessibleAvatarKey(requesterId, targetUserId)
    if (!key) {
      throw notFound('Avatar not found')
    }

    const mimeType = key.endsWith('.jpg')
      ? 'image/jpeg'
      : key.endsWith('.png')
        ? 'image/png'
        : key.endsWith('.webp')
          ? 'image/webp'
          : null
    if (!mimeType) {
      this.deps.logger.warn({ targetUserId }, 'avatar has an unsupported storage key')
      throw notFound('Avatar not found')
    }

    return { buffer: await this.deps.storage.get(key), mimeType }
  }

  async getPreferences(userId: string): Promise<UserPreferencesDto> {
    const stored = await this.deps.repository.findPreferences(userId)
    if (!stored) {
      return DEFAULT_PREFERENCES
    }
    return {
      theme: stored.theme as UserPreferencesDto['theme'],
      locale: resolveSupportedLocale(stored.locale) ?? DEFAULT_LOCALE,
      digestSummaries: stored.digestSummaries,
      emailNotifications: stored.emailNotifications,
      weeklyReport: stored.weeklyReport,
    }
  }

  async updatePreferences(
    userId: string,
    patch: UpdatePreferencesDto,
  ): Promise<UserPreferencesDto> {
    await this.deps.repository.upsertPreferences(userId, patch)
    this.deps.logger.info({ userId }, 'preferences updated')
    return this.getPreferences(userId)
  }

  async searchUsers(
    userId: string,
    query: UserSearchQuery,
  ): Promise<{ items: UserDto[]; total: number; meta: PaginationMeta }> {
    const { skip, take } = toPaginationParams(query)
    const result = await this.deps.repository.searchUsers({
      q: query.q,
      orgId: query.orgId,
      excludeUserId: userId,
      skip,
      take,
    })
    const meta = buildPaginationMeta(query.page, query.pageSize, result.total)
    return { items: result.items.map((user) => this.toUserDto(user)), total: result.total, meta }
  }

  private toUserDto(user: {
    id: string
    email: string
    fullName: string
    bio: string | null
    avatarKey: string | null
    isEmailVerified: boolean
    createdAt: Date
  }): UserDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      bio: user.bio,
      avatarKey: user.avatarKey,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt.toISOString(),
    }
  }
}
