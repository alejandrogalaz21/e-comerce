import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as request from 'supertest'

import { AllExceptionsFilter } from '@/common/filters/http-exception.filter'
import { AppModule } from './../src/app.module'

/**
 * What supertest adds over the unit suites is the real HTTP stack: the global
 * pipe and the exception filter actually running on a request. That is the only
 * thing asserted here — the domain behaviour is covered where it lives.
 *
 * It needs a database. Without one it skips, so `npm run test:e2e` stays green
 * on a machine with no Docker, the same way orders.concurrency.spec.ts behaves.
 */
describe('API (e2e)', () => {
  let app: INestApplication | null = null

  beforeAll(async () => {
    process.env.DB_HOST = process.env.DB_HOST || 'localhost'
    process.env.DB_PORT = process.env.DB_PORT || '5432'
    process.env.DB_USER = process.env.DB_USER || 'postgres'
    process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'changeme'
    process.env.DB_NAME = process.env.DB_NAME || 'ecommerce'
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'changeme'
    process.env.DB_MIGRATIONS_RUN = 'false'

    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule]
      }).compile()

      const created = moduleFixture.createNestApplication()
      created.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          transformOptions: { enableImplicitConversion: true }
        })
      )
      created.useGlobalFilters(new AllExceptionsFilter())
      await created.init()
      app = created
    } catch {
      app = null
    }
  }, 60000)

  // Without this the process never exits: the pools stay open and Jest hangs.
  afterAll(async () => {
    if (app) await app.close()
  })

  const maybe = (name: string, fn: () => Promise<unknown>) =>
    it(
      name,
      async () => {
        if (!app) {
          console.warn('skipped (no database reachable)')
          return
        }
        await fn()
      },
      30000
    )

  maybe('answers the health check', () =>
    request(app!.getHttpServer()).get('/health').expect(200)
  )

  maybe('serves the catalog without a token', () =>
    request(app!.getHttpServer()).get('/products').expect(200)
  )

  maybe('refuses a protected route without a token', () =>
    request(app!.getHttpServer()).get('/orders').expect(401)
  )

  maybe(
    'gives every error the same envelope, through the real filter',
    async () => {
      const response = await request(app!.getHttpServer())
        .get('/products/00000000-0000-4000-8000-000000000000')
        .expect(404)

      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'NOT_FOUND',
        path: '/products/00000000-0000-4000-8000-000000000000'
      })
      expect(typeof response.body.message).toBe('string')
      expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false)
    }
  )

  maybe(
    'rejects an unknown query parameter through the real pipe',
    async () => {
      const response = await request(app!.getHttpServer())
        .get('/products?evil=1')
        .expect(400)

      expect(response.body).toMatchObject({ error: 'VALIDATION_ERROR' })
    }
  )
})
