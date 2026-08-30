import { createHash, randomBytes } from 'node:crypto'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { unauthorized } from '../errors/index.js'

export interface AccessTokenPayload {
  sub: string
  sessionId: string
  type: 'access'
}

export interface VerifiedAccessTokenPayload extends AccessTokenPayload {
  expiresAt: number
}

export function signAccessToken(
  payload: AccessTokenPayload,
  secret: string,
  expiresInSeconds: number,
): string {
  const options: SignOptions = { algorithm: 'HS256', expiresIn: expiresInSeconds }
  return jwt.sign(payload, secret, options)
}

export function verifyAccessToken(token: string, secret: string): VerifiedAccessTokenPayload {
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] })
    if (
      typeof decoded === 'string' ||
      decoded.type !== 'access' ||
      typeof decoded.sub !== 'string' ||
      decoded.sub.length === 0 ||
      typeof decoded.sessionId !== 'string' ||
      decoded.sessionId.length === 0 ||
      typeof decoded.exp !== 'number'
    ) {
      throw unauthorized('Invalid access token')
    }
    return {
      sub: decoded.sub,
      sessionId: decoded.sessionId,
      type: 'access',
      expiresAt: decoded.exp,
    }
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      throw unauthorized('Invalid or expired access token')
    }
    throw error
  }
}

export function generateOpaqueToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
