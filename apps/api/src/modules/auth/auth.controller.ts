import type { Request, Response } from 'express'
import type { AppConfig } from '../../config/index.js'
import type { AuthResponseDto, LoginDto, RegisterDto } from '@orbit/shared'
import { respond } from '../../shared/http/index.js'
import type { AuthService } from './auth.service.js'
import { auditContextFromRequest, type AuditService } from '../../shared/audit/audit.js'

export const REFRESH_COOKIE_NAME = 'orbit_refresh'

export class AuthController {
  constructor(
    private readonly service: AuthService,
    private readonly config: AppConfig,
    private readonly auditService: AuditService,
  ) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.register(req.body as RegisterDto, this.requestContext(req))
    await this.auditService.record({
      ...auditContextFromRequest(req),
      actorId: result.user.id,
      action: 'account.registered',
      resourceType: 'user',
      resourceId: result.user.id,
    })
    this.issueCookies(res, result)
    respond<AuthResponseDto>(res, this.toResponse(result), { status: 201 })
  }

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.login(req.body as LoginDto, this.requestContext(req))
    await this.auditService.record({
      ...auditContextFromRequest(req),
      actorId: result.user.id,
      action: 'account.login',
      resourceType: 'user',
      resourceId: result.user.id,
    })
    this.issueCookies(res, result)
    respond<AuthResponseDto>(res, this.toResponse(result))
  }

  refresh = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.refresh(
      req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined,
      this.requestContext(req),
    )
    await this.auditService.record({
      ...auditContextFromRequest(req),
      actorId: result.user.id,
      action: 'session.refreshed',
      resourceType: 'user',
      resourceId: result.user.id,
    })
    this.issueCookies(res, result)
    respond<AuthResponseDto>(res, this.toResponse(result))
  }

  logout = async (req: Request, res: Response): Promise<void> => {
    await this.service.logout(req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined)
    await this.auditService.record({
      ...auditContextFromRequest(req),
      action: 'session.logout',
      resourceType: 'session',
      resourceId: req.user?.sessionId,
    })
    this.clearCookies(res)
    respond(res, { success: true })
  }

  logoutAll = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      respond(res, { success: true })
      return
    }
    await this.service.logoutAll(req.user.id)
    await this.auditService.record({
      ...auditContextFromRequest(req),
      action: 'session.logout_all',
      resourceType: 'user',
      resourceId: req.user.id,
    })
    this.clearCookies(res)
    respond(res, { success: true })
  }

  me = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      respond(res, { success: true })
      return
    }
    const user = await this.service.getMe(req.user.id)
    respond(res, { user })
  }

  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body as { token: string }
    const userId = await this.service.verifyEmail(token)
    await this.auditService.record({
      ...auditContextFromRequest(req),
      actorId: userId,
      action: 'account.email_verified',
      resourceType: 'user',
      resourceId: userId,
    })
    respond(res, { success: true })
  }

  resendVerification = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body as { email: string }
    await this.service.resendVerification(email)
    respond(res, { success: true })
  }

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body as { email: string }
    await this.service.forgotPassword(email)
    respond(res, { success: true })
  }

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { token, password } = req.body as { token: string; password: string }
    const userId = await this.service.resetPassword(token, password)
    await this.auditService.record({
      ...auditContextFromRequest(req),
      actorId: userId,
      action: 'account.password_reset',
      resourceType: 'user',
      resourceId: userId,
    })
    respond(res, { success: true })
  }

  private requestContext(req: Request): { ipAddress?: string; userAgent?: string } {
    return {
      ipAddress: req.ip,
      userAgent: req.header('user-agent'),
    }
  }

  private issueCookies(
    res: Response,
    session: { refreshToken: string; cookieMaxAgeMs: number },
  ): void {
    const secure = this.config.isProduction
    res.cookie(REFRESH_COOKIE_NAME, session.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: session.cookieMaxAgeMs,
    })
  }

  private clearCookies(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      path: '/api/v1/auth',
    })
  }

  private toResponse(result: AuthResponseDto): AuthResponseDto {
    return {
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      sessionExpiresAt: result.sessionExpiresAt,
    }
  }
}
