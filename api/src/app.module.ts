// src/app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
// Config
import { PgConfig, AppConfig } from '@/config'
// Database
import { PgModule } from '@/database/postgres/pg.module'
// Common
import { CommonModule } from '@/common/common.module'
import { LoggerMiddleware } from '@/common/middleware/logger.middleware'
// Business Modules
import { UsersModule } from '@/modules/users/users.module'
import { AuthModule } from '@/modules/auth/auth.module'
import { ProductsModule } from '@/modules/products/products.module'
import { HealthModule } from '@/modules/health/health.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [AppConfig, PgConfig] }),
    PgModule,
    CommonModule,
    UsersModule,
    ProductsModule,
    AuthModule,
    HealthModule
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
