import { MigrationInterface, QueryRunner } from 'typeorm'

export class ProductPriceIndex1788048000000 implements MigrationInterface {
  name = 'ProductPriceIndex1788048000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_products_price" ON "products" ("price")`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_price"`)
  }
}
