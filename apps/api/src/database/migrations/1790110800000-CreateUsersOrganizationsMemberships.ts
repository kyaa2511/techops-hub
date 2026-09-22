import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersOrganizationsMemberships1790110800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "clerkUserId" character varying NOT NULL,
        "email" character varying NOT NULL,
        "firstName" character varying,
        "lastName" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_clerk_user_id" UNIQUE ("clerkUserId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organizations_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(
      `CREATE TYPE "membership_role_enum" AS ENUM ('OWNER', 'ADMIN', 'MEMBER')`,
    );

    await queryRunner.query(`
      CREATE TABLE "memberships" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "organizationId" uuid NOT NULL,
        "role" "membership_role_enum" NOT NULL DEFAULT 'MEMBER',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_memberships_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_memberships_user_organization" UNIQUE ("userId", "organizationId"),
        CONSTRAINT "FK_memberships_user_id" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_memberships_organization_id" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_memberships_user_id" ON "memberships" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_memberships_organization_id" ON "memberships" ("organizationId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_memberships_organization_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_memberships_user_id"`);
    await queryRunner.query(`DROP TABLE "memberships"`);
    await queryRunner.query(`DROP TYPE "membership_role_enum"`);
    await queryRunner.query(`DROP TABLE "organizations"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
