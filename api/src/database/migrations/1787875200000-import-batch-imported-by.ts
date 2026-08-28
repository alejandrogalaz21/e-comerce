import { MigrationInterface, QueryRunner } from 'typeorm'

export class ImportBatchImportedBy1787875200000 implements MigrationInterface {
  name = 'ImportBatchImportedBy1787875200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "import_batches" ADD COLUMN IF NOT EXISTS "imported_by" character varying(255)`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "import_batches" DROP COLUMN IF EXISTS "imported_by"`
    )
  }
}
