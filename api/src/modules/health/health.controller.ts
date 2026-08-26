// src/modules/health/health.controller.ts
import { Controller, Get } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger'
import { DynamoDBHealthService } from '@/database/dynamodb/dynamodb-health.service'
import { PgHealthService } from '@/database/postgres/pg-health.service'
import { performance } from 'perf_hooks'
import * as os from 'os'

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private configService: ConfigService,
    private dynamoHealth: DynamoDBHealthService,
    private pgHealth: PgHealthService
  ) {}

  @ApiExcludeEndpoint()
  @Get('/')
  root() {
    return {
      message: 'Timi API is running!',
      hint: 'Visit /api/v1 for the REST API.',
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  }

  @Get('health')
  async healthCheck() {
    // Calculate uptime
    const startedAt = Number(process.env.APP_STARTED_AT || Date.now())
    const now = Date.now()
    const uptimeMs = now - startedAt

    // Application info
    const app = {
      ok: true,
      name: this.configService.get('app.name'),
      version: this.configService.get('app.version'),
      env: this.configService.get('app.environment'),
      status: 'healthy',
      startTime: new Date(startedAt).toISOString(),
      uptimeMs,
      node: process.version
    }

    // RAM metrics (all values are in bytes)
    const mem = process.memoryUsage()
    // CPU usage since process start (values in microseconds)
    const cpuUsage = process.cpuUsage()
    // Load average over 1, 5, 15 minutes (unit: "load" per core; on Windows this is [0,0,0])
    const loadAvg = os.loadavg()
    // Number of CPU cores
    const cpuCount = os.cpus()?.length ?? 0

    // Event loop delay (measures how busy/blocking the event loop is; unit: milliseconds)
    const start = performance.now()
    await new Promise(r => setImmediate(r))
    const eventLoopDelayMs = performance.now() - start

    const resources = {
      memory: {
        // Resident Set Size: total memory allocated for the process (bytes)
        rss: mem.rss,
        // Heap used: actual JS heap used (bytes)
        heapUsed: mem.heapUsed,
        // Heap total: allocated JS heap (bytes)
        heapTotal: mem.heapTotal
      },
      cpu: {
        // Number of logical CPU cores
        cpuCount,
        // Load average over 1m, 5m, 15m (per core). Windows returns zeros.
        loadAvg,
        // CPU time spent by the process since start (microseconds)
        usageMicros: cpuUsage,
        // Event loop delay (ms) — higher values indicate blocking or heavy sync work
        eventLoopDelayMs
      }
    }

    // Check DynamoDB connection
    const t1 = Date.now()
    const ddbHealth = await this.dynamoHealth.checkConnection()
    const ddbLatencyMs = Date.now() - t1

    // Check Postgres connection
    const t2 = Date.now()
    const pgHealth = await this.pgHealth.check()
    const pgLatencyMs = Date.now() - t2
    const pgStats = await this.pgHealth.stats()

    return {
      app,
      resources,
      dynamodb: { ddbHealth, latencyMs: ddbLatencyMs },
      postgres: { pgHealth, latencyMs: pgLatencyMs, stats: pgStats }
    }
  }
}
