import type { Request, Response } from 'express'
import type { UpdatePreferencesDto, UpdateProfileDto, UserSearchQuery } from '@orbit/shared'
import { badRequest } from '../../core/errors/index.js'
import { respond } from '../../shared/http/index.js'
import type { UsersService } from './users.service.js'

export class UsersController {
  constructor(private readonly service: UsersService) {}

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    const user = await this.service.updateProfile(req.user!.id, req.body as UpdateProfileDto)
    respond(res, user)
  }

  uploadAvatar = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      throw badRequest('An avatar image is required')
    }
    const user = await this.service.uploadAvatar(req.user!.id, {
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
    })
    respond(res, user)
  }

  deleteAvatar = async (req: Request, res: Response): Promise<void> => {
    const user = await this.service.deleteAvatar(req.user!.id)
    respond(res, user)
  }

  getAvatar = async (req: Request, res: Response): Promise<void> => {
    const { userId } = res.locals.validatedParams as { userId: string }
    const avatar = await this.service.getAuthorizedAvatar(req.user!.id, userId)
    res
      .status(200)
      .set({
        'Cache-Control': 'private, max-age=300',
        'Content-Disposition': 'inline; filename="avatar"',
        'Content-Length': String(avatar.buffer.byteLength),
        'Content-Type': avatar.mimeType,
        'X-Content-Type-Options': 'nosniff',
      })
      .send(avatar.buffer)
  }

  getPreferences = async (req: Request, res: Response): Promise<void> => {
    const preferences = await this.service.getPreferences(req.user!.id)
    respond(res, preferences)
  }

  updatePreferences = async (req: Request, res: Response): Promise<void> => {
    const preferences = await this.service.updatePreferences(
      req.user!.id,
      req.body as UpdatePreferencesDto,
    )
    respond(res, preferences)
  }

  search = async (req: Request, res: Response): Promise<void> => {
    const query = res.locals.validatedQuery as UserSearchQuery
    const result = await this.service.searchUsers(req.user!.id, query)
    respond(res, result.items, { meta: result.meta })
  }
}
