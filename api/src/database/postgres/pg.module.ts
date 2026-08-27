import { join } from 'path'
import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DatabaseConfig } from '@/common/interfaces/db.interface'
import { buildPgConnectionOptions } from './pg-connection.options'
import { PgHealthService } from './pg-health.service'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const config = configService.get<DatabaseConfig>('pg')

        return {
          ...buildPgConnectionOptions(config),
          autoLoadEntities: true,
          synchronize: config.synchronize,
          migrations: [join(__dirname, '..', 'migrations', '*{.ts,.js}')],
          migrationsRun: config.migrationsRun
        }
      },
      inject: [ConfigService]
    })
  ],
  providers: [PgHealthService],
  exports: [PgHealthService]
})
export class PgModule {}
