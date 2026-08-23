import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient | null = null

export function createPrismaClient(
  databaseUrl = process.env.DATABASE_URL,
  maxConnections = 10,
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

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = createPrismaClient()
  }
  return prisma
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}
