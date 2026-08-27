import { MigrationInterface, QueryRunner } from 'typeorm'

export class InitialSchema1787702400000 implements MigrationInterface {
  name = 'InitialSchema1787702400000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum" AS ENUM('SYSTEM_ADMIN', 'ADMIN', 'USER')`
    )
    await queryRunner.query(
      `CREATE TYPE "public"."user_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'BANNED', 'PENDING', 'DELETED', 'REJECTED', 'SUSPENDED')`
    )
    await queryRunner.query(
      `CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sku" character varying(50) NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "category" character varying(100) NOT NULL DEFAULT 'Uncategorized',
        "price" numeric(10,2) NOT NULL,
        "stock" integer NOT NULL DEFAULT '0',
        "weight_kg" numeric(10,3),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_c44ac33a05b144dd0d9ddcf9327" UNIQUE ("sku"),
        CONSTRAINT "CHK_aea3ee263e1d44e36e5f5b5783" CHECK ("stock" >= 0),
        CONSTRAINT "CHK_4f89fdb25537b37409d3b781c8" CHECK ("price" >= 0),
        CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id")
      )`
    )
    await queryRunner.query(
      `CREATE TABLE "import_batches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "filename" character varying(255) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'processing',
        "total_rows" integer NOT NULL DEFAULT '0',
        "inserted" integer NOT NULL DEFAULT '0',
        "updated" integer NOT NULL DEFAULT '0',
        "unchanged" integer NOT NULL DEFAULT '0',
        "rejected" integer NOT NULL DEFAULT '0',
        "skipped_empty" integer NOT NULL DEFAULT '0',
        "report" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_6162597a2576c03e04bb2c1a2dd" PRIMARY KEY ("id")
      )`
    )
    await queryRunner.query(
      `CREATE TABLE "user" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "role" "public"."user_role_enum" NOT NULL DEFAULT 'USER',
        "status" "public"."user_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "photoURL" character varying,
        "phone" character varying NOT NULL,
        "address" character varying,
        "postalCode" character varying,
        "city" character varying,
        "country" character varying,
        "state" character varying,
        "age" integer,
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "refreshToken" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"),
        CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")
      )`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user"`)
    await queryRunner.query(`DROP TABLE "import_batches"`)
    await queryRunner.query(`DROP TABLE "products"`)
    await queryRunner.query(`DROP TYPE "public"."user_status_enum"`)
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`)
  }
}
