import {
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

import { CacheService } from './cache.service'
import { REDIS_CLIENT } from './redis.constants'

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const client = new Redis({
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          retryStrategy: times => Math.min(times * 500, 5000)
        })
        const logger = new Logger('Redis')
        client.on('error', err => logger.warn(`Redis: ${err.message}`))
        client.on('ready', () => logger.log('Redis connection ready'))
        return client
      },
      inject: [ConfigService]
    },
    CacheService
  ],
  exports: [REDIS_CLIENT, CacheService]
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async onApplicationShutdown() {
    try {
      await this.client.quit()
    } catch {
      this.client.disconnect()
    }
  }
}

export { REDIS_CLIENT }
