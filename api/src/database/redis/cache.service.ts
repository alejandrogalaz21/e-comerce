import { Inject, Injectable, Logger } from '@nestjs/common'
import Redis from 'ioredis'

import { REDIS_CLIENT } from './redis.constants'

/**
 * A cache that can never decide whether a request is answered. Every access is
 * wrapped: a read that fails falls through to the caller's own computation, and
 * a write that fails is swallowed. An optimisation that can take the service
 * down is not an optimisation.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name)

  /**
   * A safety net for what explicit invalidation cannot cover: a write straight to
   * the database, or an invalidation lost to a Redis blip.
   */
  static readonly DEFAULT_TTL_SECONDS = 300

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  /**
   * The key is built from the already-validated DTO with its fields sorted, not
   * from the raw URL: `?q=a&q=b` and `?q=b&q=a` ask for the same thing, and
   * parameter order should not create a second entry.
   */
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

  /**
   * Invalidation drops the whole prefix rather than individual entries. Working
   * out which cached queries a new product belongs to is a hard problem — it
   * joins any search matching its text and any price range containing it — and
   * getting it wrong means serving stale data silently, the worst failure a
   * cache has. The catalog is written rarely and read often, which is exactly
   * when this trade pays.
   */
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
