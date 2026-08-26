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
      synchronize: process.env.DB_SYNC
        ? process.env.DB_SYNC === 'true'
        : process.env.NODE_ENV !== 'production',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    }
)
