import { describe, expect, it } from 'vitest'

import { getSafeAuthReturnPath } from './auth-return-path'

describe('getSafeAuthReturnPath', () => {
  it('preserves an internal application destination including its query and hash', () => {
    expect(getSafeAuthReturnPath('/app/organizations?invitationToken=secret-token#accept')).toBe(
      '/app/organizations?invitationToken=secret-token#accept',
    )
  })

  it.each([
    undefined,
    null,
    42,
    '',
    '/',
    '/application',
    '//attacker.example/app',
    'https://attacker.example/app',
  ])('falls back to the application root for unsafe destination %j', (destination) => {
    expect(getSafeAuthReturnPath(destination)).toBe('/app')
  })
})
