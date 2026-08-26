// src/database/postgres/pg-health.service.ts
import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'

@Injectable()
export class PgHealthService {
  constructor(private readonly dataSource: DataSource) {}

  async check() {
    try {
      await this.dataSource.query('SELECT 1')
      return { ok: true, message: 'Postgres connection OK', status: 'healthy' }
    } catch (error) {
      return {
        ok: false,
        message: 'Failed to connect to Postgres',
        status: 'unhealthy',
        error: (error as Error).message
      }
    }
  }

  async stats() {
    try {
      const rows = await this.dataSource.query(
        'SELECT count(*)::int AS active FROM pg_stat_activity WHERE state = $1',
        ['active']
      )
      return { ok: true, activeConnections: rows[0]?.active ?? 0 }
    } catch (error) {
      return { ok: false, error: (error as Error).message }
    }
  }
}
