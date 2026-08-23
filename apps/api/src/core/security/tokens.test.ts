import jwt from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'
import { signAccessToken, verifyAccessToken } from './tokens.js'

const SECRET = 'test-secret-that-is-longer-than-thirty-two-characters'
const OTHER_SECRET = 'other-secret-that-is-longer-than-thirty-two-characters'

describe('access tokens', () => {
  it('round-trips a valid access token', () => {
    const token = signAccessToken(
      { sub: 'user-1', sessionId: 'session-1', type: 'access' },
      SECRET,
      60,
    )

    expect(verifyAccessToken(token, SECRET)).toEqual({
      sub: 'user-1',
      sessionId: 'session-1',
      type: 'access',
    })
  })

  it('rejects a token signed with another secret', () => {
    const token = signAccessToken(
      { sub: 'user-1', sessionId: 'session-1', type: 'access' },
      OTHER_SECRET,
      60,
    )

    expect(() => verifyAccessToken(token, SECRET)).toThrow('Invalid or expired access token')
  })

  it('rejects expired access tokens', () => {
    const token = signAccessToken(
      { sub: 'user-1', sessionId: 'session-1', type: 'access' },
      SECRET,
      -1,
    )

    expect(() => verifyAccessToken(token, SECRET)).toThrow('Invalid or expired access token')
  })

  it('rejects a signed token with missing identity claims', () => {
    const token = jwt.sign({ type: 'access' }, SECRET, { algorithm: 'HS256', expiresIn: 60 })

    expect(() => verifyAccessToken(token, SECRET)).toThrow('Invalid access token')
  })

  it('rejects a token signed with a non-allowlisted algorithm', () => {
    const token = jwt.sign({ sub: 'user-1', sessionId: 'session-1', type: 'access' }, SECRET, {
      algorithm: 'HS512',
      expiresIn: 60,
    })

    expect(() => verifyAccessToken(token, SECRET)).toThrow('Invalid or expired access token')
  })
})
