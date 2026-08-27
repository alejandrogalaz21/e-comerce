import { registerAs } from '@nestjs/config'
import { DatabaseConfig } from '@/common/interfaces/db.interface'

export default registerAs(
  'pg',
  () =>
    <DatabaseConfig>{
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      synchronize: process.env.DB_SYNC === 'true',
      migrationsRun: process.env.DB_MIGRATIONS_RUN
        ? process.env.DB_MIGRATIONS_RUN === 'true'
        : true,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    }
)
