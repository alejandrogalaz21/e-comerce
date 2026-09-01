import { MigrationInterface, QueryRunner } from 'typeorm'

export class OrderPaymentMethod1788393600000 implements MigrationInterface {
  name = 'OrderPaymentMethod1788393600000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
        ADD COLUMN IF NOT EXISTS "payment_method" varchar(20)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
        DROP COLUMN IF EXISTS "payment_method"
    `)
  }
}
