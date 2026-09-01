import { DataSource } from 'typeorm'

import { PaginationResponseBuilder } from '@/common/pagination/pagination-response.builder'
import { Product } from '@/modules/products/entities/product.entity'
import { ChargeResult } from '@/modules/payment/payment.interface'

import { Order } from './entities/order.entity'
import { OrderItem } from './entities/order-item.entity'
import { OrderStatus } from './order-status.enum'
import { PaymentMethod } from './payment-method.enum'
import { OrdersService } from './orders.service'

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
  email: 'ada@example.com',
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
      shippingAddress: SHIPPING,
      paymentMethod: PaymentMethod.CARD
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
      shippingAddress: SHIPPING,
      paymentMethod: PaymentMethod.CARD
    })
    await service.create({
      items: [{ productId: wanted, quantity: 2 }],
      idempotencyKey: `${PREFIX}b`,
      shippingAddress: SHIPPING,
      paymentMethod: PaymentMethod.CARD
    })
    await service.create({
      items: [{ productId: other, quantity: 1 }],
      idempotencyKey: `${PREFIX}c`,
      shippingAddress: SHIPPING,
      paymentMethod: PaymentMethod.CARD
    })

    const found = await service.findAll({
      page: 1,
      limit: 20,
      q: `${PREFIX}WANTED`
    })

    expect(mine(found)).toHaveLength(2)
  })

  maybe('finds an order by the recipient name or phone', async () => {
    const source = dataSource as DataSource
    const service = serviceFor(source)
    const productId = await seedProduct(source, 'SHIP', 'Shipped Product')

    await service.create({
      items: [{ productId, quantity: 1 }],
      idempotencyKey: `${PREFIX}ada`,
      shippingAddress: SHIPPING,
      paymentMethod: PaymentMethod.CARD
    })
    await service.create({
      items: [{ productId, quantity: 1 }],
      idempotencyKey: `${PREFIX}grace`,
      shippingAddress: {
        ...SHIPPING,
        name: 'Grace Hopper',
        phone: '+13125550143'
      },
      paymentMethod: PaymentMethod.CARD
    })

    const byName = await service.findAll({ page: 1, limit: 20, q: 'hopper' })
    const byPhone = await service.findAll({ page: 1, limit: 20, q: '5552671' })

    expect(mine(byName).map(order => order.shipName)).toEqual(['Grace Hopper'])
    expect(mine(byPhone).map(order => order.shipName)).toEqual(['Ada Lovelace'])
  })

  maybe('finds an order by its contact email or its city', async () => {
    const source = dataSource as DataSource
    const service = serviceFor(source)
    const productId = await seedProduct(source, 'CONTACT', 'Contact Product')

    await service.create({
      items: [{ productId, quantity: 1 }],
      idempotencyKey: `${PREFIX}springfield`,
      shippingAddress: SHIPPING,
      paymentMethod: PaymentMethod.CARD
    })
    await service.create({
      items: [{ productId, quantity: 1 }],
      idempotencyKey: `${PREFIX}hermosillo`,
      paymentMethod: PaymentMethod.CARD,
      shippingAddress: {
        ...SHIPPING,
        name: 'Grace Hopper',
        email: 'grace@example.org',
        city: 'Hermosillo'
      }
    })

    const byEmail = await service.findAll({
      page: 1,
      limit: 20,
      q: 'grace@example.org'
    })
    const byEmailFragment = await service.findAll({
      page: 1,
      limit: 20,
      q: 'example.org'
    })
    const byCity = await service.findAll({
      page: 1,
      limit: 20,
      q: 'hermosillo'
    })
    const byNothing = await service.findAll({
      page: 1,
      limit: 20,
      q: 'no order carries this text'
    })

    expect(mine(byEmail).map(order => order.shipEmail)).toEqual([
      'grace@example.org'
    ])
    expect(mine(byEmailFragment).map(order => order.shipEmail)).toEqual([
      'grace@example.org'
    ])
    expect(mine(byCity).map(order => order.shipCity)).toEqual(['Hermosillo'])
    expect(mine(byNothing)).toHaveLength(0)
  })

  maybe('keeps finding an order after the product is renamed', async () => {
    const source = dataSource as DataSource
    const service = serviceFor(source)
    const productId = await seedProduct(source, 'RENAMED', 'Original Name')

    await service.create({
      items: [{ productId, quantity: 1 }],
      idempotencyKey: `${PREFIX}renamed`,
      shippingAddress: SHIPPING,
      paymentMethod: PaymentMethod.CARD
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
      shippingAddress: SHIPPING,
      paymentMethod: PaymentMethod.CARD
    })
    await expect(
      serviceFor(source, declining).create({
        items: [{ productId, quantity: 1 }],
        idempotencyKey: `${PREFIX}failed`,
        shippingAddress: SHIPPING,
        paymentMethod: PaymentMethod.CARD
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
      shippingAddress: SHIPPING,
      paymentMethod: PaymentMethod.CARD
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

  maybe('includes the whole of the dateTo day', async () => {
    const source = dataSource as DataSource
    const service = serviceFor(source)
    const productId = await seedProduct(source, 'DATE', 'Date Product')

    const { order } = await service.create({
      items: [{ productId, quantity: 1 }],
      idempotencyKey: `${PREFIX}today`,
      shippingAddress: SHIPPING,
      paymentMethod: PaymentMethod.CARD
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

  maybe(
    'reports a total that follows the filter, not the whole table',
    async () => {
      const source = dataSource as DataSource
      const service = serviceFor(source)
      const productId = await seedProduct(source, 'TOTAL', 'Total Product')

      await service.create({
        items: [{ productId, quantity: 1 }],
        idempotencyKey: `${PREFIX}total-1`,
        shippingAddress: SHIPPING,
        paymentMethod: PaymentMethod.CARD
      })
      await service.create({
        items: [{ productId, quantity: 1 }],
        idempotencyKey: `${PREFIX}total-2`,
        shippingAddress: SHIPPING,
        paymentMethod: PaymentMethod.CARD
      })

      const found = await service.findAll({
        page: 1,
        limit: 20,
        q: `${PREFIX}TOTAL`
      })

      expect(found.pagination.total).toBe(2)
      expect(found.data).toHaveLength(2)
    }
  )

  maybe(
    'a search that matches nothing returns nothing, not everything',
    async () => {
      const service = serviceFor(dataSource as DataSource)

      const found = await service.findAll({
        page: 1,
        limit: 20,
        q: `${PREFIX}NO-SUCH-THING`
      })

      expect(found.data).toHaveLength(0)
      expect(found.pagination.total).toBe(0)
    }
  )
})
