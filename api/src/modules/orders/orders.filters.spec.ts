import { DataSource } from 'typeorm'

import { PaginationResponseBuilder } from '@/common/pagination/pagination-response.builder'
import { Product } from '@/modules/products/entities/product.entity'
import { ChargeResult } from '@/modules/payment/payment.interface'

import { Order } from './entities/order.entity'
import { OrderItem } from './entities/order-item.entity'
import { OrderStatus } from './order-status.enum'
import { OrdersService } from './orders.service'

/**
 * The filters are Postgres expressions — ILIKE, a cast to text, an interval on
 * the upper bound — so a mocked repository would assert that the code builds a
 * string, never that the string selects the right rows. These run against a real
 * database and skip when there is none, like the concurrency spec.
 */
const CONNECTION = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'changeme',
  database: process.env.DB_NAME || 'ecommerce'
}

const PREFIX = 'FILTER-TEST-'

const SHIPPING = {
  name: 'Ada Lovelace',
  phone: '+14155552671',
  address: '1 Test Street',
  city: 'Springfield',
  state: 'IL',
  zipCode: '62701',
  country: 'United States'
}

let dataSource: DataSource | null = null

const approving = {
  charge: async (): Promise<ChargeResult> => ({
    status: 'approved',
    reference: 'fake_ch_test'
  })
}

const declining = {
  charge: async (): Promise<ChargeResult> => ({
    status: 'declined',
    reason: 'card declined by the issuer'
  })
}

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
    new PaginationResponseBuilder<Order>(),
    { invalidateCache: async () => {} } as never
  )
}

async function seedProduct(
  source: DataSource,
  sku: string,
  name: string
): Promise<string> {
  const [created] = await source.query(
    `INSERT INTO "products" ("sku", "name", "category", "price", "stock")
     VALUES ($1, $2, 'Test', '10.00', 500) RETURNING "id"`,
    [`${PREFIX}${sku}`, name]
  )

  return created.id
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

describe('Filtering orders against a real database', () => {
  beforeAll(async () => {
    dataSource = await connect()
  }, 60000)

  afterEach(async () => {
    if (!dataSource) return
    await dataSource.query(`DELETE FROM "order_items" WHERE "sku" LIKE $1`, [
      `${PREFIX}%`
    ])
    await dataSource.query(
      `DELETE FROM "orders" WHERE "idempotency_key" LIKE $1`,
      [`${PREFIX}%`]
    )
    await dataSource.query(`DELETE FROM "products" WHERE "sku" LIKE $1`, [
      `${PREFIX}%`
    ])
  })

  afterAll(async () => {
    if (dataSource) await dataSource.destroy()
  })

  /** Only the orders this spec created; the database may hold others. */
  const mine = (result: { data: Order[] }): Order[] =>
    result.data.filter(order =>
      order.items.some(item => item.sku.startsWith(PREFIX))
    )

  maybe('finds an order by the abbreviated id the UI shows', async () => {
    const source = dataSource as DataSource
    const service = serviceFor(source)
    const productId = await seedProduct(source, 'ID', 'Findable Product')

    const { order } = await service.create({
      items: [{ productId, quantity: 1 }],
      idempotencyKey: `${PREFIX}by-id`,
      shippingAddress: SHIPPING
    })

    const found = await service.findAll({
      page: 1,
      limit: 20,
      q: order.id.slice(0, 8)
    })

    expect(found.data).toHaveLength(1)
    expect(found.data[0].id).toBe(order.id)
    expect(found.pagination.total).toBe(1)
  })

  maybe('finds every order that contains a SKU', async () => {
    const source = dataSource as DataSource
    const service = serviceFor(source)
    const wanted = await seedProduct(source, 'WANTED', 'Wanted Product')
    const other = await seedProduct(source, 'OTHER', 'Other Product')

    await service.create({
      items: [{ productId: wanted, quantity: 1 }],
      idempotencyKey: `${PREFIX}a`,
      shippingAddress: SHIPPING
    })
    await service.create({
      items: [{ productId: wanted, quantity: 2 }],
      idempotencyKey: `${PREFIX}b`,
      shippingAddress: SHIPPING
    })
    await service.create({
      items: [{ productId: other, quantity: 1 }],
      idempotencyKey: `${PREFIX}c`,
      shippingAddress: SHIPPING
    })

    const found = await service.findAll({
      page: 1,
      limit: 20,
      q: `${PREFIX}WANTED`
    })

    expect(mine(found)).toHaveLength(2)
  })

  /**
   * The lines store the SKU and name as sold. Searching the catalog instead
   * would make renaming a product lose the orders that bought it, which is the
   * opposite of what a snapshot is for.
   */
  maybe('keeps finding an order after the product is renamed', async () => {
    const source = dataSource as DataSource
    const service = serviceFor(source)
    const productId = await seedProduct(source, 'RENAMED', 'Original Name')

    await service.create({
      items: [{ productId, quantity: 1 }],
      idempotencyKey: `${PREFIX}renamed`,
      shippingAddress: SHIPPING
    })

    await source.query(
      `UPDATE "products" SET "name" = 'Brand New Name' WHERE "id" = $1`,
      [productId]
    )

    const found = await service.findAll({
      page: 1,
      limit: 20,
      q: 'Original Name'
    })

    expect(mine(found)).toHaveLength(1)
  })

  maybe('narrows to a single status', async () => {
    const source = dataSource as DataSource
    const productId = await seedProduct(source, 'STATUS', 'Status Product')

    await serviceFor(source).create({
      items: [{ productId, quantity: 1 }],
      idempotencyKey: `${PREFIX}paid`,
      shippingAddress: SHIPPING
    })
    await expect(
      serviceFor(source, declining).create({
        items: [{ productId, quantity: 1 }],
        idempotencyKey: `${PREFIX}failed`,
        shippingAddress: SHIPPING
      })
    ).rejects.toBeDefined()

    const service = serviceFor(source)
    const failed = await service.findAll({
      page: 1,
      limit: 20,
      status: OrderStatus.FAILED
    })
    const paid = await service.findAll({
      page: 1,
      limit: 20,
      status: OrderStatus.PAID
    })

    expect(mine(failed)).toHaveLength(1)
    expect(mine(paid)).toHaveLength(1)
  })

  maybe('combines search with status', async () => {
    const source = dataSource as DataSource
    const service = serviceFor(source)
    const productId = await seedProduct(source, 'COMBO', 'Combo Product')

    await service.create({
      items: [{ productId, quantity: 1 }],
      idempotencyKey: `${PREFIX}combo-paid`,
      shippingAddress: SHIPPING
    })

    const hit = await service.findAll({
      page: 1,
      limit: 20,
      q: `${PREFIX}COMBO`,
      status: OrderStatus.PAID
    })
    const miss = await service.findAll({
      page: 1,
      limit: 20,
      q: `${PREFIX}COMBO`,
      status: OrderStatus.FAILED
    })

    expect(mine(hit)).toHaveLength(1)
    expect(mine(miss)).toHaveLength(0)
  })

  /**
   * `<= dateTo` would cut the range at midnight and drop everything bought that
   * day, which is exactly what a reviewer would try first.
   */
  maybe('includes the whole of the dateTo day', async () => {
    const source = dataSource as DataSource
    const service = serviceFor(source)
    const productId = await seedProduct(source, 'DATE', 'Date Product')

    const { order } = await service.create({
      items: [{ productId, quantity: 1 }],
      idempotencyKey: `${PREFIX}today`,
      shippingAddress: SHIPPING
    })

    const day = order.createdAt.toISOString().slice(0, 10)
    const found = await service.findAll({
      page: 1,
      limit: 20,
      dateFrom: day,
      dateTo: day
    })

    expect(mine(found)).toHaveLength(1)
  })

  maybe(
    'rejects an inverted date range instead of returning nothing',
    async () => {
      const service = serviceFor(dataSource as DataSource)

      await expect(
        service.findAll({
          page: 1,
          limit: 20,
          dateFrom: '2026-09-01',
          dateTo: '2026-08-01'
        })
      ).rejects.toMatchObject({ status: 400 })
    }
  )

  maybe('reports a total that follows the filter, not the whole table', async () => {
    const source = dataSource as DataSource
    const service = serviceFor(source)
    const productId = await seedProduct(source, 'TOTAL', 'Total Product')

    await service.create({
      items: [{ productId, quantity: 1 }],
      idempotencyKey: `${PREFIX}total-1`,
      shippingAddress: SHIPPING
    })
    await service.create({
      items: [{ productId, quantity: 1 }],
      idempotencyKey: `${PREFIX}total-2`,
      shippingAddress: SHIPPING
    })

    const found = await service.findAll({
      page: 1,
      limit: 20,
      q: `${PREFIX}TOTAL`
    })

    // The join to the lines must not multiply the order by them.
    expect(found.pagination.total).toBe(2)
    expect(found.data).toHaveLength(2)
  })

  maybe('a search that matches nothing returns nothing, not everything', async () => {
    const service = serviceFor(dataSource as DataSource)

    const found = await service.findAll({
      page: 1,
      limit: 20,
      q: `${PREFIX}NO-SUCH-THING`
    })

    expect(found.data).toHaveLength(0)
    expect(found.pagination.total).toBe(0)
  })
})
