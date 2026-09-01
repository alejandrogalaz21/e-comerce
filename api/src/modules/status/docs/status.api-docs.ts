import { applyDecorators } from '@nestjs/common'
import { ApiOperation } from '@nestjs/swagger'

export const ApiRedisStatus = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Redis round-trip demo (INCR + PING + INFO)',
      description:
        'Writes and reads real data in Redis. Never returns 500: if Redis is down it responds with ok=false.'
    })
  )

export const ApiDatabaseStatus = () =>
  applyDecorators(
    ApiOperation({
      summary: 'PostgreSQL read demo (NOW + version + products count)',
      description:
        'Queries real data from Postgres through TypeORM. Never returns 500: if the DB is down it responds with ok=false.'
    })
  )
