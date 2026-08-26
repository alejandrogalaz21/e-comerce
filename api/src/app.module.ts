// src/app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
// Config
import { PgConfig, AppConfig } from '@/config'
// Database
import { PgModule } from '@/database/postgres/pg.module'
import { DynamoDbModule } from '@/database/dynamodb/dynamodb.module'
// Common
import { CommonModule } from '@/common/common.module'
import { LoggerMiddleware } from '@/common/middleware/logger.middleware'
// Business Modules
import { UsersModule } from '@/modules/users/users.module'
import { AuthModule } from '@/modules/auth/auth.module'
import { OrdersModule } from '@/modules/orders/orders.module'
import { ProductsModule } from '@/modules/products/products.module'
import { ClientsModule } from '@/modules/clients/clients.module'
import { CredentialsModule } from '@/modules/credentials/credentials.module'
import { TaxProfilesModule } from '@/modules/tax-profiles/tax-profiles.module'
import { TaxAddressesModule } from '@/modules/tax-addresses/tax-addresses.module'
import { TaxRegimesModule } from '@/modules/tax-regimes/tax-regimes.module'
import { TaxActivitiesModule } from '@/modules/tax-activities/tax-activities.module'
import { TaxObligationsModule } from '@/modules/tax-obligations/tax-obligations.module'
// Shared Services
import { WhatsAppModule } from '@/shared/whatsapp/whatsapp.module'
import { OpenAIModule } from '@/shared/openai/openai.module'
import { HealthModule } from '@/modules/health/health.module'
import { SatDownloadModule } from '@/shared/sat/sat-download.module'
import { SatModule } from '@/modules/sat/sat.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [AppConfig, PgConfig] }),
    PgModule,
    DynamoDbModule,
    CommonModule,
    UsersModule,
    OrdersModule,
    ProductsModule,
    ClientsModule,
    CredentialsModule,
    TaxProfilesModule,
    TaxAddressesModule,
    TaxRegimesModule,
    TaxActivitiesModule,
    TaxObligationsModule,
    AuthModule,
    WhatsAppModule,
    OpenAIModule,
    SatDownloadModule,
    SatModule,
    HealthModule
  ],
  controllers: [],
  providers: [],
  exports: []
})
export class AppModule implements NestModule {
  constructor(private configService: ConfigService) {}

  configure(consumer: MiddlewareConsumer) {
    // Apply LoggerMiddleware to all routes
    consumer.apply(LoggerMiddleware).forRoutes('*')
  }
}
