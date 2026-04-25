-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "lengthCm" DOUBLE PRECISION NOT NULL,
    "widthCm" DOUBLE PRECISION NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseBatch" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCostWithIpi" DOUBLE PRECISION NOT NULL,
    "taxSubstitution" DOUBLE PRECISION NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingScenario" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT,
    "name" TEXT NOT NULL,
    "logisticsType" TEXT NOT NULL,
    "freightPayer" TEXT NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "roas" DOUBLE PRECISION NOT NULL,
    "operationalCostRate" DOUBLE PRECISION NOT NULL,
    "simpleTaxRate" DOUBLE PRECISION NOT NULL,
    "ownIcmsRate" DOUBLE PRECISION NOT NULL,
    "destinationIcmsRate" DOUBLE PRECISION NOT NULL,
    "financialCostMonthlyRate" DOUBLE PRECISION NOT NULL,
    "targetNetMarginRate" DOUBLE PRECISION NOT NULL,
    "turnoverDays" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingResult" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "salePrice" DOUBLE PRECISION NOT NULL,
    "freightCost" DOUBLE PRECISION NOT NULL,
    "storageCost" DOUBLE PRECISION NOT NULL,
    "finalUnitCost" DOUBLE PRECISION NOT NULL,
    "grossMarginRate" DOUBLE PRECISION NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "netMarginAmount" DOUBLE PRECISION NOT NULL,
    "netMarginUnitAmount" DOUBLE PRECISION NOT NULL,
    "roi" DOUBLE PRECISION NOT NULL,
    "annualizedRoi" DOUBLE PRECISION NOT NULL,
    "revenueTotal" DOUBLE PRECISION NOT NULL,
    "adsInvestment" DOUBLE PRECISION NOT NULL,
    "statusJson" JSONB NOT NULL,
    "candidateJson" JSONB NOT NULL,
    "ratesEffectiveFrom" TIMESTAMP(3) NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreightRate" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "minWeightKg" DOUBLE PRECISION NOT NULL,
    "maxWeightKg" DOUBLE PRECISION,
    "priceBandMin" DOUBLE PRECISION NOT NULL,
    "priceBandMax" DOUBLE PRECISION,
    "freightCost" DOUBLE PRECISION NOT NULL,
    "freightMode" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreightRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FullStorageRate" (
    "id" TEXT NOT NULL,
    "sizeCategory" TEXT NOT NULL,
    "maxLengthCm" DOUBLE PRECISION,
    "maxWidthCm" DOUBLE PRECISION,
    "maxHeightCm" DOUBLE PRECISION,
    "maxWeightKg" DOUBLE PRECISION,
    "dailyUnitRate" DOUBLE PRECISION NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "agedStorageLabels" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FullStorageRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PurchaseBatch" ADD CONSTRAINT "PurchaseBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingScenario" ADD CONSTRAINT "PricingScenario_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingScenario" ADD CONSTRAINT "PricingScenario_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PurchaseBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingResult" ADD CONSTRAINT "PricingResult_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "PricingScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
