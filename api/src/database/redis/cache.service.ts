import { Inject, Injectable, Logger } from '@nestjs/common'
import Redis from 'ioredis'

import { REDIS_CLIENT } from './redis.constants'

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name)

  static readonly DEFAULT_TTL_SECONDS = 300

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  static buildKey(
    prefix: string,
    params: Record<string, unknown> = {}
  ): string {
    const normalized = Object.keys(params)
      .filter(key => params[key] !== undefined && params[key] !== null)
      .sort()
      .map(key => {
        const value = params[key]
        const serialized = Array.isArray(value)
          ? [...value].map(String).sort().join(',')
          : String(value)

        return `${key}=${serialized}`
      })
      .join('&')

    return normalized ? `${prefix}:${normalized}` : `${prefix}:all`
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.client.get(key)

      return cached ? (JSON.parse(cached) as T) : null
    } catch (error) {
      this.logger.warn(`cache read failed for '${key}': ${describe(error)}`)
      return null
    }
  }

  async set(
    key: string,
    value: unknown,
    ttlSeconds = CacheService.DEFAULT_TTL_SECONDS
  ): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds)
    } catch (error) {
      this.logger.warn(`cache write failed for '${key}': ${describe(error)}`)
    }
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    try {
      const keys = await this.client.keys(`${prefix}:*`)

      if (keys.length) await this.client.del(...keys)
    } catch (error) {
      this.logger.warn(
        `cache invalidation failed for '${prefix}': ${describe(error)}`
      )
    }
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error'
}
