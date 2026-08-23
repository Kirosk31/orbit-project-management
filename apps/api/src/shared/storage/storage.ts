import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { AppConfig } from '../../config/index.js'
import { badRequest, isAppError, notFound } from '../../core/errors/index.js'
import type { Logger } from '../../core/logger/logger.js'

export interface StoredFile {
  key: string
  size: number
  mimeType: string
}

export interface StorageService {
  put(key: string, data: Buffer, options: { mimeType: string }): Promise<StoredFile>
  get(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}

export class LocalStorageService implements StorageService {
  constructor(
    private readonly rootDir: string,
    private readonly logger: Logger,
  ) {}

  private resolveCandidate(key: string): { candidate: string; root: string } {
    const root = path.resolve(this.rootDir)
    if (!key || path.isAbsolute(key) || key.includes('\0')) {
      throw badRequest('Invalid storage key')
    }

    const candidate = path.resolve(root, key)
    if (candidate === root || !candidate.startsWith(`${root}${path.sep}`)) {
      this.logger.warn('rejected storage key outside configured root')
      throw badRequest('Invalid storage key')
    }

    return { candidate, root }
  }

  private async resolveWritablePath(key: string): Promise<string> {
    const { candidate, root } = this.resolveCandidate(key)
    await fs.mkdir(root, { recursive: true })
    await fs.mkdir(path.dirname(candidate), { recursive: true })

    const [realRoot, realParent] = await Promise.all([
      fs.realpath(root),
      fs.realpath(path.dirname(candidate)),
    ])
    if (realParent !== realRoot && !realParent.startsWith(`${realRoot}${path.sep}`)) {
      this.logger.warn('rejected storage path through a symlink outside configured root')
      throw badRequest('Invalid storage key')
    }

    return candidate
  }

  private async resolveExistingPath(key: string): Promise<string> {
    const { candidate, root } = this.resolveCandidate(key)
    try {
      const [realRoot, realCandidate] = await Promise.all([
        fs.realpath(root),
        fs.realpath(candidate),
      ])
      if (realCandidate === realRoot || !realCandidate.startsWith(`${realRoot}${path.sep}`)) {
        this.logger.warn('rejected stored symlink outside configured root')
        throw badRequest('Invalid storage key')
      }
      return realCandidate
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw notFound('File not found')
      }
      throw error
    }
  }

  async put(key: string, data: Buffer, options: { mimeType: string }): Promise<StoredFile> {
    const filePath = await this.resolveWritablePath(key)
    await fs.writeFile(filePath, data)
    return { key, size: data.byteLength, mimeType: options.mimeType }
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(await this.resolveExistingPath(key))
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = await this.resolveExistingPath(key)
      await fs.unlink(filePath)
    } catch (error) {
      if (isAppError(error) && error.code === 'NOT_FOUND') {
        return
      }
      throw error
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(await this.resolveExistingPath(key))
      return true
    } catch (error) {
      if (isAppError(error) && error.code === 'NOT_FOUND') {
        return false
      }
      throw error
    }
  }
}

export function createStorageService(config: AppConfig, logger: Logger): StorageService {
  return new LocalStorageService(config.env.UPLOAD_DIR, logger)
}
