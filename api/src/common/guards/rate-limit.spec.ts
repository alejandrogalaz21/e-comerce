import { INestApplication } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import {
  ThrottlerGuard,
  ThrottlerModule,
  ThrottlerOptions
} from '@nestjs/throttler'
import { Test, TestingModule } from '@nestjs/testing'
import * as request from 'supertest'

import { ThrottleConfig, THROTTLE } from '@/config'
import { OrdersController } from '@/modules/orders/orders.controller'
import { OrdersService } from '@/modules/orders/orders.service'

describe('rate limiting, as the guard actually applies it', () => {
  let app: INestApplication

  const ordersService = {
    create: jest.fn().mockResolvedValue({
      order: { id: 'order-id', items: [] },
      replayed: false
    }),
    findAll: jest.fn(),
    findOne: jest.fn()
  }

  const payload = {
    items: [{ productId: '0d6cd087-3f2e-4f30-b0aa-cf9c93b1c0d5', quantity: 1 }],
    idempotencyKey: 'rate-limit-spec-key'
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [ThrottleConfig] }),
        ThrottlerModule.forRootAsync({
          useFactory: (configService: ConfigService) => [
            configService.get<ThrottlerOptions>('throttle.default')
          ],
          inject: [ConfigService]
        })
      ],
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: ordersService },
        { provide: APP_GUARD, useClass: ThrottlerGuard }
      ]
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  const placeOrder = () =>
    request(app.getHttpServer()).post('/orders').send(payload)

  it('lets the guest checkout run right up to its own ceiling', async () => {
    for (let attempt = 0; attempt < THROTTLE.placeOrder.limit; attempt++) {
      const response = await placeOrder()

      expect(response.status).not.toBe(429)
    }
  })

  it('answers 429 on the attempt past the ceiling', async () => {
    const response = await placeOrder()

    expect(response.status).toBe(429)
  })

  it('applies the route ceiling, not the far looser global one', () => {
    expect(THROTTLE.placeOrder.limit).toBeLessThan(THROTTLE.default.limit)
  })
})
