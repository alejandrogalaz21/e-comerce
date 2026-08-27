import { DatabaseConfig } from '@/common/interfaces/db.interface'

export function buildPgConnectionOptions(config: DatabaseConfig) {
  return {
    type: 'postgres' as const,
    host: config.host,
    port: config.port,
    username: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl
  }
}
