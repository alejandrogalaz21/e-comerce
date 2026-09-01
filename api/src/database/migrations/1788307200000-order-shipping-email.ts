import { MigrationInterface, QueryRunner } from 'typeorm'

export class OrderShippingEmail1788307200000 implements MigrationInterface {
  name = 'OrderShippingEmail1788307200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
        ADD COLUMN IF NOT EXISTS "ship_email" varchar(255)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
        DROP COLUMN IF EXISTS "ship_email"
    `)
  }
}
