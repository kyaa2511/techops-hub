import { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateCustomers1791676800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "customer_status_enum" AS ENUM ('ACTIVE', 'INACTIVE')`,
    );
    await queryRunner.query(`CREATE TABLE "customers" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "organizationId" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "name" varchar(120) NOT NULL CHECK (length(trim("name")) > 0),
      "email" varchar(254), "phone" varchar(40), "address" varchar(1000), "notes" varchar(5000),
      "status" customer_status_enum NOT NULL DEFAULT 'ACTIVE',
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_customers_organization_created" ON "customers" ("organizationId", "createdAt", "id")`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "customers"');
    await queryRunner.query('DROP TYPE "customer_status_enum"');
  }
}
