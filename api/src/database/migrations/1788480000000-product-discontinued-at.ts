import { MigrationInterface, QueryRunner } from 'typeorm'

export class ProductDiscontinuedAt1788480000000 implements MigrationInterface {
  name = 'ProductDiscontinuedAt1788480000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD COLUMN IF NOT EXISTS "discontinued_at" TIMESTAMP WITH TIME ZONE
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
        DROP COLUMN IF EXISTS "discontinued_at"
    `)
  }
}
