import { MigrationInterface, QueryRunner } from 'typeorm'

export class ProductHistory1788566400000 implements MigrationInterface {
  name = 'ProductHistory1788566400000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL,
        "sku" character varying(50) NOT NULL,
        "operation" character varying(10) NOT NULL,
        "changed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "old_data" jsonb,
        "new_data" jsonb,
        "changed_fields" text[] NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_product_history" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_product_history_operation"
          CHECK ("operation" IN ('INSERT', 'UPDATE', 'DELETE'))
      )
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_product_history_product"
        ON "product_history" ("product_id", "changed_at" DESC)
    `)

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION product_snapshot(row_data products) RETURNS jsonb AS $$
        -- to_jsonb turns a numeric column into a JSON number, and a consumer
        -- reading it back gets a float. Money is a string everywhere else in
        -- this system; the audit of it cannot be the one place that is not.
        SELECT to_jsonb(row_data) || jsonb_build_object(
          'price', row_data.price::text,
          'weight_kg', row_data.weight_kg::text
        );
      $$ LANGUAGE sql IMMUTABLE
    `)

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION record_product_history() RETURNS trigger AS $$
      DECLARE
        changed text[];
      BEGIN
        IF TG_OP = 'INSERT' THEN
          INSERT INTO product_history (product_id, sku, operation, new_data, changed_fields)
          VALUES (NEW.id, NEW.sku, 'INSERT', product_snapshot(NEW), '{}');
          RETURN NEW;
        END IF;

        IF TG_OP = 'DELETE' THEN
          INSERT INTO product_history (product_id, sku, operation, old_data, changed_fields)
          VALUES (OLD.id, OLD.sku, 'DELETE', product_snapshot(OLD), '{}');
          RETURN OLD;
        END IF;

        SELECT array_agg(before.key ORDER BY before.key)
          INTO changed
          FROM jsonb_each(product_snapshot(OLD)) AS before
          JOIN jsonb_each(product_snapshot(NEW)) AS after ON after.key = before.key
         WHERE before.value IS DISTINCT FROM after.value
           AND before.key <> 'updatedAt';

        IF changed IS NULL THEN
          RETURN NEW;
        END IF;

        INSERT INTO product_history (product_id, sku, operation, old_data, new_data, changed_fields)
        VALUES (NEW.id, NEW.sku, 'UPDATE', product_snapshot(OLD), product_snapshot(NEW), changed);

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `)

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_product_history ON "products"
    `)

    await queryRunner.query(`
      CREATE TRIGGER trg_product_history
        AFTER INSERT OR UPDATE OR DELETE ON "products"
        FOR EACH ROW EXECUTE FUNCTION record_product_history()
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_product_history ON "products"`
    )
    await queryRunner.query(`DROP FUNCTION IF EXISTS record_product_history()`)
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS product_snapshot(products)`
    )
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_product_history_product"`
    )
    await queryRunner.query(`DROP TABLE IF EXISTS "product_history"`)
  }
}
