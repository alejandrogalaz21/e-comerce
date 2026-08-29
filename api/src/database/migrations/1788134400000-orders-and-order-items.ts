import { MigrationInterface, QueryRunner } from 'typeorm'

export class OrdersAndOrderItems1788134400000 implements MigrationInterface {
  name = 'OrdersAndOrderItems1788134400000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "status" character varying(20) NOT NULL,
        "total_amount" numeric(12,2) NOT NULL,
        "idempotency_key" character varying(100) NOT NULL,
        "payment_reference" character varying(100),
        "decline_reason" character varying(255),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_orders" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_orders_idempotency_key" UNIQUE ("idempotency_key")
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "sku" character varying(50) NOT NULL,
        "name" character varying(255) NOT NULL,
        "quantity" integer NOT NULL,
        "unit_price_snapshot" numeric(12,2) NOT NULL,
        CONSTRAINT "PK_order_items" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_order_items_quantity" CHECK ("quantity" > 0),
        CONSTRAINT "CHK_order_items_unit_price" CHECK ("unit_price_snapshot" >= 0),
        CONSTRAINT "FK_order_items_order" FOREIGN KEY ("order_id")
          REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_items_product" FOREIGN KEY ("product_id")
          REFERENCES "products"("id") ON DELETE RESTRICT
      )
    `)

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_order_items_order_id" ON "order_items" ("order_id")`
    )
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_orders_created_at" ON "orders" ("createdAt")`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_created_at"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_items_order_id"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "order_items"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "orders"`)
  }
}
