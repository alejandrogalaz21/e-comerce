import { DataSource } from 'typeorm'

import { PaginationResponseBuilder } from '@/common/pagination/pagination-response.builder'
import { Product } from '@/modules/products/entities/product.entity'
import { ChargeResult } from '@/modules/payment/payment.interface'

import { Order } from './entities/order.entity'
import { OrderItem } from './entities/order-item.entity'
import { OrdersService } from './orders.service'

/**
 * Locking and deadlock ordering are properties of Postgres, not of the service:
 * a mocked repository would assert that the code calls FOR UPDATE, never that
 * FOR UPDATE does its job. These run against a real database and skip when there
 * is none, so `npm test` still passes without Docker.
 */
const CONNECTION = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'changeme',
  database: process.env.DB_NAME || 'ecommerce'
}

const SKU_PREFIX = 'CONCURRENCY-TEST-'

let dataSource: DataSource | null = null

const approving = { charge: async (): Promise<ChargeResult> => ({ status: 'approved', reference: 'fake_ch_test' }) }

async function connect(): Promise<DataSource | null> {
  const candidate = new DataSource({
    type: 'postgres',
    ...CONNECTION,
    entities: [Product, Order, OrderItem],
    migrations: ['src/database/migrations/*.ts'],
    synchronize: false,
    logging: false
  })

  try {
    await candidate.initialize()
    await candidate.runMigrations()
    return candidate
  } catch {
    return null
  }
}

function serviceFor(source: DataSource, payment = approving): OrdersService {
  return new OrdersService(
    source,
    source.getRepository(Order),
    payment as never,
    new PaginationResponseBuilder<Order>()
  )
}

async function seedProduct(
  source: DataSource,
  sku: string,
  stock: number,
  price = '10.00'
): Promise<string> {
  const [created] = await source.query(
    `INSERT INTO "products" ("sku", "name", "category", "price", "stock")
     VALUES ($1, $2, 'Test', $3, $4) RETURNING "id"`,
    [`${SKU_PREFIX}${sku}`, `Product ${sku}`, price, stock]
  )

  return created.id
}

async function stockOf(source: DataSource, productId: string): Promise<number> {
  const [product] = await source.query(
    `SELECT "stock" FROM "products" WHERE "id" = $1`,
    [productId]
  )

  return product.stock
}

const maybe = (name: string, fn: () => Promise<void>) =>
  it(name, async () => {
    if (!dataSource) {
      console.warn(`skipped (no database at ${CONNECTION.host}:${CONNECTION.port})`)
      return
    }
    await fn()
  }, 30000)

describe('OrdersService against a real database', () => {
  beforeAll(async () => {
    dataSource = await connect()
  }, 60000)

  afterEach(async () => {
    if (!dataSource) return
    await dataSource.query(
      `DELETE FROM "order_items" WHERE "sku" LIKE $1`,
      [`${SKU_PREFIX}%`]
    )
    await dataSource.query(
      `DELETE FROM "orders" WHERE "idempotency_key" LIKE $1`,
      [`${SKU_PREFIX}%`]
    )
    await dataSource.query(`DELETE FROM "products" WHERE "sku" LIKE $1`, [
      `${SKU_PREFIX}%`
    ])
  })

  afterAll(async () => {
    if (dataSource) await dataSource.destroy()
  })

  maybe('sells the last unit exactly once under simultaneous purchases', async () => {
    const source = dataSource!
    const productId = await seedProduct(source, 'LAST-ONE', 1)
    const service = serviceFor(source)

    const results = await Promise.allSettled([
      service.create({
        items: [{ productId, quantity: 1 }],
        idempotencyKey: `${SKU_PREFIX}buyer-a`
      }),
      service.create({
        items: [{ productId, quantity: 1 }],
        idempotencyKey: `${SKU_PREFIX}buyer-b`
      })
    ])

    const fulfilled = results.filter(result => result.status === 'fulfilled')
    const rejected = results.filter(result => result.status === 'rejected')

    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect((rejected[0] as PromiseRejectedResult).reason.response.error).toBe(
      'INSUFFICIENT_STOCK'
    )
    expect(await stockOf(source, productId)).toBe(0)
  })

  maybe('never drives stock negative under many simultaneous buyers', async () => {
    const source = dataSource!
    const productId = await seedProduct(source, 'RUSH', 5)
    const service = serviceFor(source)

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, index) =>
        service.create({
          items: [{ productId, quantity: 1 }],
          idempotencyKey: `${SKU_PREFIX}rush-${index}`
        })
      )
    )

    const sold = results.filter(result => result.status === 'fulfilled').length

    expect(sold).toBe(5)
    expect(await stockOf(source, productId)).toBe(0)
  })

  maybe('resolves two orders that list the same products in opposite order', async () => {
    const source = dataSource!
    const first = await seedProduct(source, 'DEADLOCK-A', 10)
    const second = await seedProduct(source, 'DEADLOCK-B', 10)
    const service = serviceFor(source)

    const results = await Promise.allSettled([
      service.create({
        items: [
          { productId: first, quantity: 1 },
          { productId: second, quantity: 1 }
        ],
        idempotencyKey: `${SKU_PREFIX}forward`
      }),
      service.create({
        items: [
          { productId: second, quantity: 1 },
          { productId: first, quantity: 1 }
        ],
        idempotencyKey: `${SKU_PREFIX}reverse`
      })
    ])

    expect(results.every(result => result.status === 'fulfilled')).toBe(true)
    expect(await stockOf(source, first)).toBe(8)
    expect(await stockOf(source, second)).toBe(8)
  })

  maybe('replaying one key charges and discounts only once', async () => {
    const source = dataSource!
    const productId = await seedProduct(source, 'REPLAY', 10)
    const service = serviceFor(source)
    const order = {
      items: [{ productId, quantity: 2 }],
      idempotencyKey: `${SKU_PREFIX}same-key`
    }

    const first = await service.create(order)
    const second = await service.create(order)

    expect(second.replayed).toBe(true)
    expect(second.order.id).toBe(first.order.id)
    expect(await stockOf(source, productId)).toBe(8)
  })

  maybe('rolls back the stock when the charge is declined', async () => {
    const source = dataSource!
    const productId = await seedProduct(source, 'DECLINED', 7)
    const service = serviceFor(source, {
      charge: async (): Promise<ChargeResult> => ({
        status: 'declined',
        reason: 'card declined by the issuer'
      })
    })

    await expect(
      service.create({
        items: [{ productId, quantity: 3 }],
        idempotencyKey: `${SKU_PREFIX}declined`
      })
    ).rejects.toMatchObject({ status: 402 })

    expect(await stockOf(source, productId)).toBe(7)

    const [failed] = await source.query(
      `SELECT "status" FROM "orders" WHERE "idempotency_key" = $1`,
      [`${SKU_PREFIX}declined`]
    )
    expect(failed.status).toBe('FAILED')
  })

  maybe('keeps the purchased price after the catalog price changes', async () => {
    const source = dataSource!
    const productId = await seedProduct(source, 'SNAPSHOT', 10, '49.99')
    const service = serviceFor(source)

    const { order } = await service.create({
      items: [{ productId, quantity: 1 }],
      idempotencyKey: `${SKU_PREFIX}snapshot`
    })

    await source.query(`UPDATE "products" SET "price" = '59.99' WHERE "id" = $1`, [
      productId
    ])

    const reloaded = await service.findOne(order.id)

    expect(reloaded.items[0].unitPriceSnapshot).toBe('49.99')
    expect(reloaded.totalAmount).toBe('49.99')
  })
})
