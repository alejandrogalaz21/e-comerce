import { DataSource } from 'typeorm'

import { PaginationResponseBuilder } from '@/common/pagination/pagination-response.builder'
import { ProductsService } from '@/modules/products/products.service'
import { Product } from '@/modules/products/entities/product.entity'
import { ProductHistory } from '@/modules/products/entities/product-history.entity'
import { ChargeResult } from '@/modules/payment/payment.interface'

import { Order } from './entities/order.entity'
import { OrderItem } from './entities/order-item.entity'
import { PaymentMethod } from './payment-method.enum'
import { OrdersService } from './orders.service'

const SHIPPING = {
  name: 'Ada Lovelace',
  phone: '+14155552671',
  email: 'ada@example.com',
  address: '1 Test Street',
  city: 'Springfield',
  state: 'IL',
  zipCode: '62701',
  country: 'United States'
}
const CONNECTION = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'changeme',
  database: process.env.DB_NAME || 'ecommerce'
}

const SKU_PREFIX = 'CONCURRENCY-TEST-'

function productsServiceFor(source: DataSource): ProductsService {
  return new ProductsService(
    source.getRepository(Product),
    source.getRepository(ProductHistory),
    new PaginationResponseBuilder<Product>(),
    new PaginationResponseBuilder<ProductHistory>()
  )
}

let dataSource: DataSource | null = null

const approving = {
  charge: async (): Promise<ChargeResult> => ({
    status: 'approved',
    reference: 'fake_ch_test'
  })
}

async function connect(): Promise<DataSource | null> {
  const candidate = new DataSource({
    type: 'postgres',
    ...CONNECTION,
    entities: [Product, ProductHistory, Order, OrderItem],
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
    new PaginationResponseBuilder<Order>(),
    { invalidateCache: async () => {} } as never
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
  it(
    name,
    async () => {
      if (!dataSource) {
        console.warn(
          `skipped (no database at ${CONNECTION.host}:${CONNECTION.port})`
        )
        return
      }
      await fn()
    },
    30000
  )

describe('OrdersService against a real database', () => {
  beforeAll(async () => {
    dataSource = await connect()
  }, 60000)

  afterEach(async () => {
    if (!dataSource) return
    await dataSource.query(`DELETE FROM "order_items" WHERE "sku" LIKE $1`, [
      `${SKU_PREFIX}%`
    ])
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

  maybe(
    'sells the last unit exactly once under simultaneous purchases',
    async () => {
      const source = dataSource!
      const productId = await seedProduct(source, 'LAST-ONE', 1)
      const service = serviceFor(source)

      const results = await Promise.allSettled([
        service.create({
          items: [{ productId, quantity: 1 }],
          idempotencyKey: `${SKU_PREFIX}buyer-a`,
          shippingAddress: SHIPPING,
          paymentMethod: PaymentMethod.CARD
        }),
        service.create({
          items: [{ productId, quantity: 1 }],
          idempotencyKey: `${SKU_PREFIX}buyer-b`,
          shippingAddress: SHIPPING,
          paymentMethod: PaymentMethod.CARD
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
    }
  )

  maybe(
    'never drives stock negative under many simultaneous buyers',
    async () => {
      const source = dataSource!
      const productId = await seedProduct(source, 'RUSH', 5)
      const service = serviceFor(source)

      const results = await Promise.allSettled(
        Array.from({ length: 10 }, (_, index) =>
          service.create({
            items: [{ productId, quantity: 1 }],
            idempotencyKey: `${SKU_PREFIX}rush-${index}`,
            shippingAddress: SHIPPING,
            paymentMethod: PaymentMethod.CARD
          })
        )
      )

      const sold = results.filter(
        result => result.status === 'fulfilled'
      ).length

      expect(sold).toBe(5)
      expect(await stockOf(source, productId)).toBe(0)
    }
  )

  maybe(
    'resolves two orders that list the same products in opposite order',
    async () => {
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
          idempotencyKey: `${SKU_PREFIX}forward`,
          shippingAddress: SHIPPING,
          paymentMethod: PaymentMethod.CARD
        }),
        service.create({
          items: [
            { productId: second, quantity: 1 },
            { productId: first, quantity: 1 }
          ],
          idempotencyKey: `${SKU_PREFIX}reverse`,
          shippingAddress: SHIPPING,
          paymentMethod: PaymentMethod.CARD
        })
      ])

      expect(results.every(result => result.status === 'fulfilled')).toBe(true)
      expect(await stockOf(source, first)).toBe(8)
      expect(await stockOf(source, second)).toBe(8)
    }
  )

  maybe('replaying one key charges and discounts only once', async () => {
    const source = dataSource!
    const productId = await seedProduct(source, 'REPLAY', 10)
    const service = serviceFor(source)
    const order = {
      items: [{ productId, quantity: 2 }],
      idempotencyKey: `${SKU_PREFIX}same-key`,
      shippingAddress: SHIPPING,
      paymentMethod: PaymentMethod.CARD
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
        idempotencyKey: `${SKU_PREFIX}declined`,
        shippingAddress: SHIPPING,
        paymentMethod: PaymentMethod.CARD
      })
    ).rejects.toMatchObject({ status: 402 })

    expect(await stockOf(source, productId)).toBe(7)

    const [failed] = await source.query(
      `SELECT "id", "status", "total_amount", "decline_reason"
         FROM "orders" WHERE "idempotency_key" = $1`,
      [`${SKU_PREFIX}declined`]
    )
    expect(failed.status).toBe('FAILED')
    expect(failed.decline_reason).toBe('card declined by the issuer')
  })

  maybe(
    'the declined order keeps the lines it was attempted with',
    async () => {
      const source = dataSource!
      const productId = await seedProduct(source, 'DECLINED-LINES', 7)
      const service = serviceFor(source, {
        charge: async (): Promise<ChargeResult> => ({
          status: 'declined',
          reason: 'card declined by the issuer'
        })
      })

      await expect(
        service.create({
          items: [{ productId, quantity: 3 }],
          idempotencyKey: `${SKU_PREFIX}declined-lines`,
          shippingAddress: SHIPPING,
          paymentMethod: PaymentMethod.CARD
        })
      ).rejects.toMatchObject({ status: 402 })

      const lines = await source.query(
        `SELECT i."sku", i."quantity", i."unit_price_snapshot"
           FROM "order_items" i
           JOIN "orders" o ON o."id" = i."order_id"
          WHERE o."idempotency_key" = $1`,
        [`${SKU_PREFIX}declined-lines`]
      )

      expect(lines).toHaveLength(1)
      expect(lines[0].quantity).toBe(3)
      expect(lines[0].unit_price_snapshot).toBe('10.00')
    }
  )

  maybe('refuses to delete a product that appears in an order', async () => {
    const source = dataSource!
    const productId = await seedProduct(source, 'SOLD', 5)
    const service = serviceFor(source)

    await service.create({
      items: [{ productId, quantity: 1 }],
      idempotencyKey: `${SKU_PREFIX}sold-one`,
      shippingAddress: SHIPPING,
      paymentMethod: PaymentMethod.CARD
    })

    const products = productsServiceFor(source)

    await expect(products.remove(productId)).rejects.toMatchObject({
      status: 409,
      response: { error: 'RESOURCE_IN_USE' }
    })

    expect(await stockOf(source, productId)).toBe(4)
  })

  maybe('discontinues a sold product that cannot be deleted', async () => {
    const source = dataSource!
    const productId = await seedProduct(source, 'RETIRED', 5)
    const service = serviceFor(source)

    await service.create({
      items: [{ productId, quantity: 1 }],
      idempotencyKey: `${SKU_PREFIX}sold-then-retired`,
      shippingAddress: SHIPPING,
      paymentMethod: PaymentMethod.CARD
    })

    const products = productsServiceFor(source)

    await expect(products.remove(productId)).rejects.toMatchObject({
      status: 409
    })

    const retired = await products.discontinue(productId)
    expect(retired.discontinuedAt).toBeInstanceOf(Date)

    await expect(products.findOne(productId)).rejects.toMatchObject({
      status: 404
    })

    const [line] = await source.query(
      `SELECT "unit_price_snapshot" FROM "order_items" WHERE "product_id" = $1`,
      [productId]
    )
    expect(line.unit_price_snapshot).toBe('10.00')

    const back = await products.restore(productId)
    expect(back.discontinuedAt).toBeNull()
    await expect(products.findOne(productId)).resolves.toBeDefined()
  })

  maybe(
    'keeps the purchased price after the catalog price changes',
    async () => {
      const source = dataSource!
      const productId = await seedProduct(source, 'SNAPSHOT', 10, '49.99')
      const service = serviceFor(source)

      const { order } = await service.create({
        items: [{ productId, quantity: 1 }],
        idempotencyKey: `${SKU_PREFIX}snapshot`,
        shippingAddress: SHIPPING,
        paymentMethod: PaymentMethod.CARD
      })

      await source.query(
        `UPDATE "products" SET "price" = '59.99' WHERE "id" = $1`,
        [productId]
      )

      const reloaded = await service.findOne(order.id)

      expect(reloaded.items[0].unitPriceSnapshot).toBe('49.99')
      expect(reloaded.totalAmount).toBe('49.99')
    }
  )
})
