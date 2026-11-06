import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient | null = null

/** Pool size when DATABASE_POOL_MAX is not set. */
export const DEFAULT_DATABASE_POOL_MAX = 10

export function createPrismaClient(
  databaseUrl = process.env.DATABASE_URL,
  maxConnections = DEFAULT_DATABASE_POOL_MAX,
): PrismaClient {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to initialize Prisma')
  }

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    max: maxConnections,
  })

  return new PrismaClient({ adapter })
}

/** The process-wide client. The pool size applies when the client is first created. */
export function getPrisma(maxConnections = DEFAULT_DATABASE_POOL_MAX): PrismaClient {
  if (!prisma) {
    prisma = createPrismaClient(process.env.DATABASE_URL, maxConnections)
  }
  return prisma
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}
