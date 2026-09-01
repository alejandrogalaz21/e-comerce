import { DataSource } from 'typeorm'

import { Product } from './entities/product.entity'
import { ProductHistory } from './entities/product-history.entity'

const CONNECTION = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'changeme',
  database: process.env.DB_NAME || 'ecommerce'
}

const SKU_PREFIX = 'HISTORY-TEST-'

let dataSource: DataSource | null = null

async function connect(): Promise<DataSource | null> {
  const candidate = new DataSource({
    type: 'postgres',
    ...CONNECTION,
    entities: [Product, ProductHistory],
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

async function seed(source: DataSource, sku: string): Promise<string> {
  const [created] = await source.query(
    `INSERT INTO "products" ("sku", "name", "category", "price", "stock")
     VALUES ($1, $2, 'Test', '10.00', 5) RETURNING "id"`,
    [`${SKU_PREFIX}${sku}`, `Product ${sku}`]
  )

  return created.id
}

type Entry = {
  operation: string
  changed_fields: string[]
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
}

async function historyOf(source: DataSource, id: string): Promise<Entry[]> {
  return source.query(
    `SELECT "operation", "changed_fields", "old_data", "new_data"
       FROM "product_history"
      WHERE "product_id" = $1
      ORDER BY "changed_at" DESC, "id" DESC`,
    [id]
  )
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

describe('product history, written by a database trigger', () => {
  beforeAll(async () => {
    dataSource = await connect()
  }, 60000)

  afterEach(async () => {
    if (!dataSource) return
    await dataSource.query(
      `DELETE FROM "product_history" WHERE "sku" LIKE $1`,
      [`${SKU_PREFIX}%`]
    )
    await dataSource.query(`DELETE FROM "products" WHERE "sku" LIKE $1`, [
      `${SKU_PREFIX}%`
    ])
  })

  afterAll(async () => {
    if (dataSource) await dataSource.destroy()
  })

  maybe('records the insert that created the product', async () => {
    const source = dataSource!
    const id = await seed(source, 'CREATED')

    const entries = await historyOf(source, id)

    expect(entries).toHaveLength(1)
    expect(entries[0].operation).toBe('INSERT')
    expect(entries[0].new_data).toMatchObject({ sku: `${SKU_PREFIX}CREATED` })
    expect(entries[0].old_data).toBeNull()
  })

  maybe('records an update and names the fields that moved', async () => {
    const source = dataSource!
    const id = await seed(source, 'UPDATED')

    await source.query(
      `UPDATE "products" SET "price" = '12.00', "stock" = 3 WHERE "id" = $1`,
      [id]
    )

    const [latest] = await historyOf(source, id)

    expect(latest.operation).toBe('UPDATE')
    expect(latest.changed_fields.sort()).toEqual(['price', 'stock'])
    expect(latest.old_data).toMatchObject({ price: '10.00', stock: 5 })
    expect(latest.new_data).toMatchObject({ price: '12.00', stock: 3 })
  })

  maybe(
    'records a change made with direct SQL, which is the whole reason it lives in the database',
    async () => {
      const source = dataSource!
      const id = await seed(source, 'DIRECT-SQL')

      await source.query(
        `UPDATE "products" SET "name" = 'Renamed by hand' WHERE "id" = $1`,
        [id]
      )

      const [latest] = await historyOf(source, id)

      expect(latest.operation).toBe('UPDATE')
      expect(latest.changed_fields).toEqual(['name'])
    }
  )

  maybe('writes nothing for an update that changes nothing', async () => {
    const source = dataSource!
    const id = await seed(source, 'NO-OP')

    await source.query(
      `UPDATE "products" SET "price" = '10.00' WHERE "id" = $1`,
      [id]
    )

    const entries = await historyOf(source, id)

    expect(entries).toHaveLength(1)
    expect(entries[0].operation).toBe('INSERT')
  })

  maybe('records discontinuing and restoring as ordinary changes', async () => {
    const source = dataSource!
    const id = await seed(source, 'RETIRED')

    await source.query(
      `UPDATE "products" SET "discontinued_at" = now() WHERE "id" = $1`,
      [id]
    )
    await source.query(
      `UPDATE "products" SET "discontinued_at" = NULL WHERE "id" = $1`,
      [id]
    )

    const entries = await historyOf(source, id)

    expect(entries).toHaveLength(3)
    expect(entries[0].changed_fields).toEqual(['discontinued_at'])
    expect(entries[1].changed_fields).toEqual(['discontinued_at'])
  })

  maybe('outlives the product it documents', async () => {
    const source = dataSource!
    const id = await seed(source, 'DELETED')

    await source.query(
      `UPDATE "products" SET "price" = '20.00' WHERE "id" = $1`,
      [id]
    )
    await source.query(`DELETE FROM "products" WHERE "id" = $1`, [id])

    const entries = await historyOf(source, id)

    expect(entries).toHaveLength(3)
    expect(entries[0].operation).toBe('DELETE')
    expect(entries[0].old_data).toMatchObject({ price: '20.00' })
  })

  maybe('does not let updatedAt alone count as a change', async () => {
    const source = dataSource!
    const id = await seed(source, 'TOUCHED')

    await source.query(
      `UPDATE "products" SET "updatedAt" = now() WHERE "id" = $1`,
      [id]
    )

    const entries = await historyOf(source, id)

    expect(entries).toHaveLength(1)
  })
})
