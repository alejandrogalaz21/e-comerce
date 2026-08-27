import 'dotenv/config'
import { DataSource } from 'typeorm'
import PgConfig from '@/config/pg.configuration'
import { buildPgConnectionOptions } from './postgres/pg-connection.options'

// The TypeORM CLI runs outside the Nest context: no DI, and it reads uncompiled
// TypeScript sources instead of dist.
export default new DataSource({
  ...buildPgConnectionOptions(PgConfig()),
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false
})
