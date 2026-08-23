import type { Redis } from 'ioredis'

export interface CacheService {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>
  del(...keys: string[]): Promise<void>
  delByPattern(pattern: string): Promise<void>
  flush(): Promise<void>
  ping(): Promise<boolean>
}

export class RedisCacheService implements CacheService {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key)
    if (raw === null) {
      return null
    }
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    const stream = this.redis.scanStream({ match: pattern, count: 100 })

    for await (const keys of stream) {
      if (Array.isArray(keys) && keys.length > 0) {
        await this.redis.del(...keys)
      }
    }
  }

  async flush(): Promise<void> {
    await this.redis.flushdb()
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.redis.ping()) === 'PONG'
    } catch {
      return false
    }
  }
}
