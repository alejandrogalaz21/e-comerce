import { Controller, Get, Inject } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import Redis from 'ioredis'
import { REDIS_CLIENT } from '@/database/redis/redis.module'

@ApiTags('status')
@ApiBearerAuth('jwt')
@ApiResponse({ status: 401, description: 'Missing or invalid access token' })
@Controller('status')
export class StatusController {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectDataSource() private readonly dataSource: DataSource
  ) {}

  @Get('redis')
  @ApiOperation({
    summary: 'Redis round-trip demo (INCR + PING + INFO)',
    description:
      'Writes and reads real data in Redis. Never returns 500: if Redis is down it responds with ok=false.'
  })
  async redisStatus() {
    const startedAt = Date.now()
    try {
      const visits = await this.redis.incr('status:visits')
      const lastCheck = new Date().toISOString()
      await this.redis.set('status:last_check', lastCheck)
      const pong = await this.redis.ping()
      const info = await this.redis.info('server')
      const version = /redis_version:(\S+)/.exec(info)?.[1] ?? 'unknown'
      return {
        source: 'redis',
        ok: true,
        latencyMs: Date.now() - startedAt,
        data: { visits, pong, version, lastCheck }
      }
    } catch (error) {
      return {
        source: 'redis',
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: (error as Error).message
      }
    }
  }

  @Get('db')
  @ApiOperation({
    summary: 'PostgreSQL read demo (NOW + version + products count)',
    description:
      'Queries real data from Postgres through TypeORM. Never returns 500: if the DB is down it responds with ok=false.'
  })
  async dbStatus() {
    const startedAt = Date.now()
    try {
      const [meta] = await this.dataSource.query(
        'SELECT NOW() AS now, current_database() AS database, version() AS version'
      )
      const [count] = await this.dataSource.query(
        'SELECT COUNT(*)::int AS total FROM products'
      )
      return {
        source: 'postgres',
        ok: true,
        latencyMs: Date.now() - startedAt,
        data: {
          now: meta.now,
          database: meta.database,
          version: String(meta.version).split(' on ')[0],
          productCount: count.total
        }
      }
    } catch (error) {
      return {
        source: 'postgres',
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: (error as Error).message
      }
    }
  }
}
