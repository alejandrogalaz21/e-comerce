import { Controller, Get } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiTags } from '@nestjs/swagger'
import { PgHealthService } from '@/database/postgres/pg-health.service'
import { Public } from '@/common/decorators/public.decorator'

import { ApiHealthCheck, ApiRoot } from './docs/health.api-docs'
import { performance } from 'perf_hooks'
import * as os from 'os'

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private configService: ConfigService,
    private pgHealth: PgHealthService
  ) {}

  @Public()
  @ApiRoot()
  @Get('/')
  root() {
    return {
      message: 'E-commerce API is running!',
      hint: 'Visit /api/v1 for the REST API.',
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  }

  @Public()
  @ApiHealthCheck()
  @Get('health')
  async healthCheck() {
    const startedAt = Number(process.env.APP_STARTED_AT || Date.now())
    const now = Date.now()
    const uptimeMs = now - startedAt

    const app = {
      ok: true,
      name: this.configService.get('app.name'),
      version: this.configService.get('app.version'),
      env: this.configService.get('app.env'),
      status: 'healthy',
      startTime: new Date(startedAt).toISOString(),
      uptimeMs,
      node: process.version
    }

    const mem = process.memoryUsage()
    const cpuUsage = process.cpuUsage()
    const loadAvg = os.loadavg()
    const cpuCount = os.cpus()?.length ?? 0

    const start = performance.now()
    await new Promise(r => setImmediate(r))
    const eventLoopDelayMs = performance.now() - start

    const resources = {
      memory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal
      },
      cpu: {
        cpuCount,
        loadAvg,
        usageMicros: cpuUsage,
        eventLoopDelayMs
      }
    }

    const t = Date.now()
    const pgHealth = await this.pgHealth.check()
    const pgLatencyMs = Date.now() - t
    const pgStats = await this.pgHealth.stats()

    return {
      app,
      resources,
      postgres: { pgHealth, latencyMs: pgLatencyMs, stats: pgStats }
    }
  }
}
