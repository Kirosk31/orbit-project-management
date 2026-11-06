import { afterEach, describe, expect, it, vi } from 'vitest'

const adapterOptions: Array<Record<string, unknown>> = []

vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: class {
    constructor(options: Record<string, unknown>) {
      adapterOptions.push(options)
    }
  },
}))
vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    async $disconnect(): Promise<void> {}
  },
}))

const { createPrismaClient, disconnectPrisma, getPrisma } = await import('./prisma.js')

describe('Prisma connection pool', () => {
  afterEach(async () => {
    adapterOptions.length = 0
    await disconnectPrisma()
  })

  it('defaults to 10 connections', () => {
    createPrismaClient('postgresql://orbit@localhost:5432/orbit')
    expect(adapterOptions[0]).toMatchObject({ max: 10 })
  })

  it('uses the configured size for the shared client', () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://orbit@localhost:5432/orbit')
    getPrisma(25)
    expect(adapterOptions[0]).toMatchObject({ max: 25 })
    vi.unstubAllEnvs()
  })
})
