import { Router } from 'express'
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@orbit/shared'
import type { AppConfig } from '../../config/index.js'
import type { RateLimitConsumer } from '../../shared/ratelimit/rateLimit.js'
import type { AuditService } from '../../shared/audit/audit.js'
import { createRateLimitMiddleware, requireAuth, validateBody } from '../../shared/http/index.js'
import { AuthController } from './auth.controller.js'
import type { AuthService } from './auth.service.js'

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Registration, login and session management
 */

export interface AuthRouterDependencies {
  service: AuthService
  config: AppConfig
  rateLimiterService: RateLimitConsumer
  auditService: AuditService
}

export function createAuthRouter(deps: AuthRouterDependencies): Router {
  const controller = new AuthController(deps.service, deps.config, deps.auditService)
  const requireAuthMiddleware = requireAuth(deps.config.env.JWT_ACCESS_SECRET)
  const loginRateLimit = createRateLimitMiddleware(
    deps.rateLimiterService,
    'auth-login',
    deps.config.rateLimit.auth.login,
  )
  const registerRateLimit = createRateLimitMiddleware(
    deps.rateLimiterService,
    'auth-register',
    deps.config.rateLimit.auth.register,
  )
  const refreshRateLimit = createRateLimitMiddleware(
    deps.rateLimiterService,
    'auth-refresh',
    deps.config.rateLimit.auth.refresh,
  )
  const recoveryRateLimit = createRateLimitMiddleware(
    deps.rateLimiterService,
    'auth-recovery',
    deps.config.rateLimit.auth.recovery,
  )
  const tokenRateLimit = createRateLimitMiddleware(
    deps.rateLimiterService,
    'auth-token',
    deps.config.rateLimit.auth.token,
  )

  const router = Router()

  /**
   * @swagger
   * /auth/register:
   *   post:
   *     summary: Create an account (auto-signs-in and issues session cookies)
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password, fullName]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string, minLength: 8 }
   *               fullName: { type: string }
   *     responses:
   *       '201': { description: Account created and signed in }
   *       '409': { description: Email already registered }
   */
  router.post('/register', registerRateLimit, validateBody(registerSchema), controller.register)

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Sign in and issue access + refresh tokens
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string }
   *               rememberMe: { type: boolean }
   *     responses:
   *       '200': { description: Signed in }
   *       '401': { description: Invalid credentials }
   */
  router.post('/login', loginRateLimit, validateBody(loginSchema), controller.login)

  /**
   * @swagger
   * /auth/refresh:
   *   post:
   *     summary: Rotate the refresh token and issue a new access token
   *     tags: [Auth]
   *     responses:
   *       '200': { description: Tokens rotated }
   *       '401': { description: Invalid or reused refresh token }
   */
  router.post('/refresh', refreshRateLimit, controller.refresh)

  /**
   * @swagger
   * /auth/logout:
   *   post:
   *     summary: Revoke the current session
   *     tags: [Auth]
   *     responses:
   *       '200': { description: Signed out }
   */
  router.post('/logout', requireAuthMiddleware, controller.logout)

  /**
   * @swagger
   * /auth/logout-all:
   *   post:
   *     summary: Revoke every session except the current one
   *     tags: [Auth]
   *     responses:
   *       '200': { description: Other sessions revoked }
   */
  router.post('/logout-all', requireAuthMiddleware, controller.logoutAll)

  /**
   * @swagger
   * /auth/me:
   *   get:
   *     summary: Return the authenticated user
   *     tags: [Auth]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       '200': { description: Current user }
   *       '401': { description: Not authenticated }
   */
  router.get('/me', requireAuthMiddleware, controller.me)

  /**
   * @swagger
   * /auth/verify-email:
   *   post:
   *     summary: Verify an email address with a single-use token
   *     tags: [Auth]
   *     responses:
   *       '200': { description: Email verified }
   *       '401': { description: Invalid or expired token }
   */
  router.post(
    '/verify-email',
    tokenRateLimit,
    validateBody(verifyEmailSchema),
    controller.verifyEmail,
  )

  /**
   * @swagger
   * /auth/resend-verification:
   *   post:
   *     summary: Resend the verification email
   *     tags: [Auth]
   *     responses:
   *       '200': { description: Email queued }
   */
  router.post(
    '/resend-verification',
    recoveryRateLimit,
    validateBody(resendVerificationSchema),
    controller.resendVerification,
  )

  /**
   * @swagger
   * /auth/forgot-password:
   *   post:
   *     summary: Send a password reset email
   *     tags: [Auth]
   *     responses:
   *       '200': { description: Email queued (always returned) }
   */
  router.post(
    '/forgot-password',
    recoveryRateLimit,
    validateBody(forgotPasswordSchema),
    controller.forgotPassword,
  )

  /**
   * @swagger
   * /auth/reset-password:
   *   post:
   *     summary: Set a new password with a single-use token (revokes all sessions)
   *     tags: [Auth]
   *     responses:
   *       '200': { description: Password updated }
   *       '401': { description: Invalid or expired token }
   */
  router.post(
    '/reset-password',
    tokenRateLimit,
    validateBody(resetPasswordSchema),
    controller.resetPassword,
  )

  return router
}
