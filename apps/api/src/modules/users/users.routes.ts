import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { updatePreferencesSchema, updateProfileSchema, userSearchQuerySchema } from '@orbit/shared'
import type { AppConfig } from '../../config/index.js'
import type { RateLimitConsumer } from '../../shared/ratelimit/rateLimit.js'
import {
  createRateLimitMiddleware,
  requireAuth,
  validateBody,
  validateParams,
  validateQuery,
} from '../../shared/http/index.js'
import { UsersController } from './users.controller.js'
import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPES, type UsersService } from './users.service.js'

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: Profile, avatar and preferences management
 */

export interface UsersRouterDependencies {
  service: UsersService
  config: AppConfig
  rateLimiterService: RateLimitConsumer
}

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    callback(null, AVATAR_MIME_TYPES.includes(file.mimetype as (typeof AVATAR_MIME_TYPES)[number]))
  },
})

const avatarParamsSchema = z.object({ userId: z.uuid() }).strict()

export function createUsersRouter(deps: UsersRouterDependencies): Router {
  const controller = new UsersController(deps.service)
  const requireAuthMiddleware = requireAuth(deps.config.env.JWT_ACCESS_SECRET)
  const uploadRateLimit = createRateLimitMiddleware(
    deps.rateLimiterService,
    'avatar-upload',
    deps.config.rateLimit.application.upload,
    (req) => req.user?.id ?? req.ip ?? 'unknown',
  )
  const searchRateLimit = createRateLimitMiddleware(
    deps.rateLimiterService,
    'user-search',
    deps.config.rateLimit.application.search,
    (req) => req.user?.id ?? req.ip ?? 'unknown',
  )

  const router = Router()

  /**
   * @swagger
   * /users/me:
   *   patch:
   *     summary: Update the authenticated user's profile
   *     tags: [Users]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [fullName]
   *             properties:
   *               fullName: { type: string, maxLength: 80 }
   *               bio: { type: string, maxLength: 500 }
   *     responses:
   *       '200': { description: Updated user }
   *       '401': { description: Not authenticated }
   */
  router.patch(
    '/me',
    requireAuthMiddleware,
    validateBody(updateProfileSchema),
    controller.updateProfile,
  )

  /**
   * @swagger
   * /users/me/avatar:
   *   post:
   *     summary: Upload a new avatar (JPEG, PNG or WebP, max 2 MB)
   *     tags: [Users]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [avatar]
   *             properties:
   *               avatar: { type: string, format: binary }
   *     responses:
   *       '200': { description: Updated user with the new avatarKey }
   *       '400': { description: Missing or invalid image }
   */
  router.post(
    '/me/avatar',
    requireAuthMiddleware,
    uploadRateLimit,
    avatarUpload.single('avatar'),
    controller.uploadAvatar,
  )

  /**
   * @swagger
   * /users/me/avatar:
   *   delete:
   *     summary: Remove the current avatar
   *     tags: [Users]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       '200': { description: Updated user without an avatar }
   */
  router.delete('/me/avatar', requireAuthMiddleware, controller.deleteAvatar)

  router.get(
    '/:userId/avatar',
    requireAuthMiddleware,
    validateParams(avatarParamsSchema),
    controller.getAvatar,
  )

  /**
   * @swagger
   * /users/me/preferences:
   *   get:
   *     summary: Return the authenticated user's preferences (defaults merged)
   *     tags: [Users]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       '200': { description: User preferences }
   */
  router.get('/me/preferences', requireAuthMiddleware, controller.getPreferences)

  /**
   * @swagger
   * /users/me/preferences:
   *   patch:
   *     summary: Update one or more preferences
   *     tags: [Users]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               theme: { type: string, enum: [light, dark, system] }
   *               locale:
   *                 type: string
   *                 enum: [en, es, fr, pt-BR]
   *               digestSummaries: { type: boolean }
   *               emailNotifications: { type: boolean }
   *               weeklyReport: { type: boolean }
   *     responses:
   *       '200': { description: Merged preferences }
   */
  router.patch(
    '/me/preferences',
    requireAuthMiddleware,
    validateBody(updatePreferencesSchema),
    controller.updatePreferences,
  )

  /**
   * @swagger
   * /users/search:
   *   get:
   *     summary: Search active users by name or email (excludes the caller)
   *     tags: [Users]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { name: q, in: query, required: true, schema: { type: string } }
   *       - { name: orgId, in: query, required: true, schema: { type: string, format: uuid } }
   *       - { name: page, in: query, schema: { type: integer, minimum: 1 } }
   *       - { name: pageSize, in: query, schema: { type: integer, minimum: 1, maximum: 100 } }
   *     responses:
   *       '200': { description: Paginated user list }
   */
  router.get(
    '/search',
    requireAuthMiddleware,
    searchRateLimit,
    validateQuery(userSearchQuerySchema),
    controller.search,
  )

  return router
}
