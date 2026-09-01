import { Reflector } from '@nestjs/core'

import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator'
import { AuthController } from '@/modules/auth/auth.controller'
import { HealthController } from '@/modules/health/health.controller'
import { ImportController } from '@/modules/import/import.controller'
import { OrdersController } from '@/modules/orders/orders.controller'
import { ProductsController } from '@/modules/products/products.controller'
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard'
import { StatusController } from '@/modules/status/status.controller'

type ControllerClass = new (...args: never[]) => unknown

const reflector = new Reflector()

function isPublic(target: ControllerClass, method: string): boolean {
  const handler = target.prototype[method]
  return (
    reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [handler, target]) ===
    true
  )
}

const PUBLIC_SURFACE: [string, ControllerClass, string][] = [
  ['GET /', HealthController, 'root'],
  ['GET /health', HealthController, 'healthCheck'],
  ['GET /products', ProductsController, 'findAll'],
  ['GET /products/categories', ProductsController, 'findCategories'],
  ['GET /products/:id', ProductsController, 'findOne'],
  ['POST /orders', OrdersController, 'create'],
  ['POST /auth/sign-in', AuthController, 'signin'],
  ['POST /orders', OrdersController, 'create']
]

const PROTECTED_SURFACE: [string, ControllerClass, string][] = [
  ['POST /products', ProductsController, 'create'],
  ['PATCH /products/:id', ProductsController, 'update'],
  ['DELETE /products/:id', ProductsController, 'remove'],
  ['POST /products/import', ImportController, 'import'],
  ['GET /products/import/batches', ImportController, 'findAllBatches'],
  ['GET /products/import/batches/:id', ImportController, 'findBatch'],
  ['GET /orders', OrdersController, 'findAll'],
  ['GET /orders/:id', OrdersController, 'findOne'],
  ['GET /status/redis', StatusController, 'redisStatus'],
  ['GET /status/db', StatusController, 'dbStatus'],
  ['GET /auth/me', AuthController, 'getProfile'],
  ['POST /auth/sign-up', AuthController, 'signup'],
  ['GET /orders', OrdersController, 'findAll'],
  ['GET /orders/:id', OrdersController, 'findOne'],
  ['PATCH /products/:id/discontinue', ProductsController, 'discontinue'],
  ['PATCH /products/:id/restore', ProductsController, 'restore'],
  ['GET /products/:id/history', ProductsController, 'findHistory']
]

describe('public/protected boundary', () => {
  it.each(PUBLIC_SURFACE)('%s is public', (_route, controller, method) => {
    expect(isPublic(controller, method)).toBe(true)
  })

  it.each(PROTECTED_SURFACE)(
    '%s requires a session',
    (_route, controller, method) => {
      expect(isPublic(controller, method)).toBe(false)
    }
  )

  it.each([
    ['GET /products', 'findAll'],
    ['GET /products/:id', 'findOne']
  ])(
    '%s authenticates the caller without demanding it, so asking for discontinued products can be refused',
    (_route, method) => {
      const guards: unknown[] =
        Reflect.getMetadata(
          '__guards__',
          ProductsController.prototype[method]
        ) ?? []

      expect(guards).toContain(OptionalJwtAuthGuard)
    }
  )

  it('leaves no handler unclassified', () => {
    const classified = new Set(
      [...PUBLIC_SURFACE, ...PROTECTED_SURFACE].map(
        ([, controller, method]) => `${controller.name}.${method}`
      )
    )

    const controllers: ControllerClass[] = [
      AuthController,
      HealthController,
      ImportController,
      OrdersController,
      ProductsController,
      StatusController
    ]

    const handlers = controllers.flatMap(controller =>
      Object.getOwnPropertyNames(controller.prototype)
        .filter(name => name !== 'constructor')
        .map(name => `${controller.name}.${name}`)
    )

    expect(handlers.filter(handler => !classified.has(handler))).toEqual([])
  })
})
