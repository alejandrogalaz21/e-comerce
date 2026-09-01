import { MigrationInterface, QueryRunner } from 'typeorm'

export class OrderShippingAddress1788220800000 implements MigrationInterface {
  name = 'OrderShippingAddress1788220800000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
        ADD COLUMN IF NOT EXISTS "ship_name" varchar(255),
        ADD COLUMN IF NOT EXISTS "ship_phone" varchar(30),
        ADD COLUMN IF NOT EXISTS "ship_address" varchar(255),
        ADD COLUMN IF NOT EXISTS "ship_city" varchar(100),
        ADD COLUMN IF NOT EXISTS "ship_state" varchar(100),
        ADD COLUMN IF NOT EXISTS "ship_zip_code" varchar(20),
        ADD COLUMN IF NOT EXISTS "ship_country" varchar(100)
    `)

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_order_items_sku" ON "order_items" ("sku")`
    )
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_order_items_order_id" ON "order_items" ("order_id")`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_items_order_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_items_sku"`)
    await queryRunner.query(`
      ALTER TABLE "orders"
        DROP COLUMN IF EXISTS "ship_name",
        DROP COLUMN IF EXISTS "ship_phone",
        DROP COLUMN IF EXISTS "ship_address",
        DROP COLUMN IF EXISTS "ship_city",
        DROP COLUMN IF EXISTS "ship_state",
        DROP COLUMN IF EXISTS "ship_zip_code",
        DROP COLUMN IF EXISTS "ship_country"
    `)
  }
}
