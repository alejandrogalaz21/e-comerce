import { MigrationInterface, QueryRunner } from 'typeorm'

export class ProductSearchIndexes1787961600000 implements MigrationInterface {
  name = 'ProductSearchIndexes1787961600000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_products_name_trgm" ON "products" USING GIN ("name" gin_trgm_ops)`
    )
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_products_sku_trgm" ON "products" USING GIN ("sku" gin_trgm_ops)`
    )
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_products_category" ON "products" ("category")`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_category"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_sku_trgm"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_name_trgm"`)
  }
}
