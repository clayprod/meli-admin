-- Fase 0: multi-tenant foundation
-- Cria Org/User/LoginAttempt, adiciona orgId em entidades-raiz, faz backfill seguro
-- e amarra constraints. Idempotente quanto à criação da org default.

-- 1) Enums novos
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'OPERATOR', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "TaxRegime" AS ENUM ('SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL', 'MEI');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2) Tabela Org
CREATE TABLE IF NOT EXISTS "Org" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "taxRegime" "TaxRegime" NOT NULL DEFAULT 'SIMPLES_NACIONAL',
  "simplesAnexo" TEXT,
  "rbt12" DOUBLE PRECISION,
  "effectiveTaxRate" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Org_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Org_slug_key" ON "Org"("slug");

-- 3) Tabela User
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'OWNER',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_orgId_idx" ON "User"("orgId");

-- 4) Tabela LoginAttempt (rate limit)
CREATE TABLE IF NOT EXISTS "LoginAttempt" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "ipAddress" TEXT,
  "success" BOOLEAN NOT NULL,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LoginAttempt_email_attemptedAt_idx" ON "LoginAttempt"("email", "attemptedAt");
CREATE INDEX IF NOT EXISTS "LoginAttempt_ipAddress_attemptedAt_idx" ON "LoginAttempt"("ipAddress", "attemptedAt");

-- 5) Org default (slug "tenryu") - idempotente. Usa um id estável.
INSERT INTO "Org" ("id", "name", "slug", "taxRegime", "simplesAnexo", "createdAt", "updatedAt")
VALUES ('org_default_tenryu', 'Tenryu', 'tenryu', 'SIMPLES_NACIONAL', 'I', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- 6) Product.orgId
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_sku_key";
ALTER TABLE "Product" ALTER COLUMN "orgId" DROP DEFAULT;
UPDATE "Product" SET "orgId" = 'org_default_tenryu' WHERE "orgId" IS NULL;
ALTER TABLE "Product" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "Product" ADD CONSTRAINT "Product_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Product_orgId_idx" ON "Product"("orgId");
CREATE UNIQUE INDEX IF NOT EXISTS "Product_orgId_sku_key" ON "Product"("orgId", "sku");

-- 7) IntegrationConnection.orgId
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "orgId" TEXT;
UPDATE "IntegrationConnection" SET "orgId" = 'org_default_tenryu' WHERE "orgId" IS NULL;
ALTER TABLE "IntegrationConnection" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "IntegrationConnection" DROP CONSTRAINT IF EXISTS "IntegrationConnection_provider_externalUserId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationConnection_orgId_provider_externalUserId_key"
  ON "IntegrationConnection"("orgId", "provider", "externalUserId");
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "IntegrationConnection_orgId_idx" ON "IntegrationConnection"("orgId");

-- 8) AuditLog.orgId / userId / ipAddress
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "orgId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
UPDATE "AuditLog" SET "orgId" = 'org_default_tenryu' WHERE "orgId" IS NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "AuditLog_orgId_createdAt_idx" ON "AuditLog"("orgId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_orgId_entity_entityId_idx" ON "AuditLog"("orgId", "entity", "entityId");

-- 9) FK User -> Org (depois que Org já existe)
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
