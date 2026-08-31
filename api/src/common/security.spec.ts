import { Reflector } from '@nestjs/core'

import AppConfig from '@/config/app.configuration'
import { THROTTLE } from '@/config'
import { ImportController } from '@/modules/import/import.controller'
import { OrdersController } from '@/modules/orders/orders.controller'
import { ProductsController } from '@/modules/products/products.controller'

describe('security hardening', () => {
  describe('CORS origins', () => {
    const original = process.env.CORS_ORIGINS

    afterEach(() => {
      if (original === undefined) delete process.env.CORS_ORIGINS
      else process.env.CORS_ORIGINS = original
    })

    it('never resolves to a wildcard', () => {
      delete process.env.CORS_ORIGINS

      expect(AppConfig().corsOrigins).not.toContain('*')
    })

    it('defaults to the web container origin', () => {
      delete process.env.CORS_ORIGINS

      expect(AppConfig().corsOrigins).toEqual(['http://localhost:3000'])
    })

    it('accepts several origins and trims them', () => {
      process.env.CORS_ORIGINS = 'https://a.test , https://b.test'

      expect(AppConfig().corsOrigins).toEqual([
        'https://a.test',
        'https://b.test'
      ])
    })

    it('drops empty entries left by a trailing comma', () => {
      process.env.CORS_ORIGINS = 'https://a.test,'

      expect(AppConfig().corsOrigins).toEqual(['https://a.test'])
    })
  })

  describe('rate limiting', () => {
    const reflector = new Reflector()

    // The package declares these keys but does not export them from its root.
    const LIMIT = 'THROTTLER:LIMIT'
    const TTL = 'THROTTLER:TTL'

    const limitOf = (target: object, handler: string) =>
      reflector.get(`${LIMIT}default`, (target as never)[handler])

    const ttlOf = (target: object, handler: string) =>
      reflector.get(`${TTL}default`, (target as never)[handler])

    // These assert the decorator carries the configured ceiling. That it still
    // reaches a request is a different claim, proved in rate-limit.spec.ts.
    it('caps the CSV import, the one route that upserts the whole catalog', () => {
      expect(limitOf(ImportController.prototype, 'import')).toBe(
        THROTTLE.import.limit
      )
      expect(ttlOf(ImportController.prototype, 'import')).toBe(
        THROTTLE.import.ttl
      )
    })

    it('caps guest checkout, the one public route that writes and charges', () => {
      expect(limitOf(OrdersController.prototype, 'create')).toBe(
        THROTTLE.placeOrder.limit
      )
      expect(ttlOf(OrdersController.prototype, 'create')).toBe(
        THROTTLE.placeOrder.ttl
      )
    })

    it('keeps both route ceilings well under the global one', () => {
      expect(THROTTLE.import.limit).toBeLessThan(THROTTLE.default.limit)
      expect(THROTTLE.placeOrder.limit).toBeLessThan(THROTTLE.default.limit)
    })

    it('leaves browsing the catalog on the loose default', () => {
      expect(limitOf(ProductsController.prototype, 'findAll')).toBeUndefined()
    })

    it('leaves reading orders on the loose default: only writing is capped', () => {
      expect(limitOf(OrdersController.prototype, 'findAll')).toBeUndefined()
    })
  })
})
