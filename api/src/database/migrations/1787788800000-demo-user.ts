import { MigrationInterface, QueryRunner } from 'typeorm'
import * as bcrypt from 'bcryptjs'

export class DemoUser1787788800000 implements MigrationInterface {
  name = 'DemoUser1787788800000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const passwordHash = await bcrypt.hash('demo', 10)
    await queryRunner.query(
      `INSERT INTO "user"
        ("name", "lastName", "role", "status", "phone", "city", "country", "email", "password")
      VALUES
        ('Demo', 'User', 'ADMIN', 'ACTIVE', '+1 555 000 0000', 'Salt Lake City', 'USA', 'demo@demo.com', $1)
      ON CONFLICT ("email") DO NOTHING`,
      [passwordHash]
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "user" WHERE "email" = 'demo@demo.com'`
    )
  }
}
