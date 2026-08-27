// src/app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
// Config
import { PgConfig, AppConfig, RedisConfig } from '@/config'
// Database
import { PgModule } from '@/database/postgres/pg.module'
import { RedisModule } from '@/redis/redis.module'
// Common
import { CommonModule } from '@/common/common.module'
import { LoggerMiddleware } from '@/common/middleware/logger.middleware'
// Business Modules
import { UsersModule } from '@/modules/users/users.module'
import { AuthModule } from '@/modules/auth/auth.module'
import { ProductsModule } from '@/modules/products/products.module'
import { ImportModule } from '@/modules/import/import.module'
import { HealthModule } from '@/modules/health/health.module'
import { StatusModule } from '@/modules/status/status.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [AppConfig, PgConfig, RedisConfig]
    }),
    PgModule,
    RedisModule,
    CommonModule,
    UsersModule,
    ImportModule,
    ProductsModule,
    AuthModule,
    HealthModule,
    StatusModule
  ],
  controllers: [],
  providers: [],
  exports: []
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply LoggerMiddleware to all routes
    consumer.apply(LoggerMiddleware).forRoutes('*')
  }
}
