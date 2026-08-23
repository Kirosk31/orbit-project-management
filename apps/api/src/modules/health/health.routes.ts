import { Router } from 'express'
import { HealthController } from './health.controller.js'
import type { HealthService } from './health.service.js'

/**
 * @swagger
 * tags:
 *   - name: Health
 *     description: Service liveness and readiness probes
 */

export function createHealthRouter(service: HealthService): Router {
  const controller = new HealthController(service)
  const router = Router()

  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Liveness probe
   *     tags: [Health]
   *     responses:
   *       '200':
   *         description: Service is alive
   */
  router.get('/health', controller.liveness)

  /**
   * @swagger
   * /health/ready:
   *   get:
   *     summary: Readiness probe (checks database and redis connectivity)
   *     tags: [Health]
   *     responses:
   *       '200':
   *         description: All dependencies are reachable
   *       '503':
   *         description: One or more dependencies are unreachable
   */
  router.get('/health/ready', controller.readiness)

  return router
}
