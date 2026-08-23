import { Router } from 'express'
import { notificationListQuerySchema } from '@orbit/shared'
import type { AppConfig } from '../../config/index.js'
import { requireAuth, validateQuery } from '../../shared/http/index.js'
import { NotificationsController } from './notifications.controller.js'
import type { NotificationsRepository } from './notifications.repository.js'
import type { NotificationsService } from './notifications.service.js'

export interface NotificationsRouterDependencies {
  service: NotificationsService
  repository: NotificationsRepository
  config: AppConfig
}

export function createNotificationsRouter(deps: NotificationsRouterDependencies): Router {
  const controller = new NotificationsController(deps.service)
  const requireAuthMiddleware = requireAuth(deps.config.env.JWT_ACCESS_SECRET)

  const router = Router()

  /**
   * @swagger
   * /notifications:
   *   get:
   *     summary: List notifications for the current user
   *     tags: [Notifications]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - { name: page, in: query, schema: { type: integer, minimum: 1 } }
   *       - { name: pageSize, in: query, schema: { type: integer, minimum: 1, maximum: 100 } }
   *       - { name: unreadOnly, in: query, schema: { type: boolean } }
   *     responses:
   *       '200': { description: Notification list with pagination }
   */
  router.get(
    '/notifications',
    requireAuthMiddleware,
    validateQuery(notificationListQuerySchema),
    controller.list,
  )

  /**
   * @swagger
   * /notifications/unread-count:
   *   get:
   *     summary: Get unread notification count for the current user
   *     tags: [Notifications]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       '200': { description: Unread count }
   */
  router.get('/notifications/unread-count', requireAuthMiddleware, controller.unreadCount)
  router.get('/notifications/count', requireAuthMiddleware, controller.unreadCount)

  /**
   * @swagger
   * /notifications/{id}/read:
   *   patch:
   *     summary: Mark a notification as read
   *     tags: [Notifications]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       '200': { description: Updated notification }
   */
  router.patch('/notifications/:id/read', requireAuthMiddleware, controller.markRead)

  /**
   * @swagger
   * /notifications/read-all:
   *   post:
   *     summary: Mark all notifications as read
   *     tags: [Notifications]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       '200': { description: Marked count }
   */
  router.post('/notifications/read-all', requireAuthMiddleware, controller.markAllRead)

  return router
}
