-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('MERCADO_LIVRE', 'MERCADO_PAGO');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'ERROR', 'DISCONNECTED');

-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "accountLabel" TEXT NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "siteId" TEXT,
    "advertiserId" TEXT,
    "collectorId" TEXT,
    "scopes" TEXT,
    "tokenType" TEXT,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "metadataJson" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceListing" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "productId" TEXT,
    "itemId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "condition" TEXT,
    "domainId" TEXT,
    "categoryId" TEXT,
    "currencyId" TEXT,
    "listingTypeId" TEXT,
    "logisticType" TEXT,
    "officialStoreId" TEXT,
    "catalogListing" BOOLEAN NOT NULL DEFAULT false,
    "acceptsMercadoPago" BOOLEAN NOT NULL DEFAULT true,
    "price" DOUBLE PRECISION NOT NULL,
    "originalPrice" DOUBLE PRECISION,
    "availableQuantity" INTEGER,
    "soldQuantity" INTEGER,
    "thumbnail" TEXT,
    "permalink" TEXT,
    "videoId" TEXT,
    "picturesJson" JSONB,
    "attributesJson" JSONB,
    "shippingJson" JSONB,
    "variationsJson" JSONB,
    "tagsJson" JSONB,
    "rawJson" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingPromotion" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "promotionType" TEXT NOT NULL,
    "subType" TEXT,
    "status" TEXT NOT NULL,
    "name" TEXT,
    "dealPrice" DOUBLE PRECISION,
    "originalPrice" DOUBLE PRECISION,
    "fixedPercentage" DOUBLE PRECISION,
    "fixedAmount" DOUBLE PRECISION,
    "sellerPercentage" DOUBLE PRECISION,
    "meliPercentage" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "finishDate" TIMESTAMP(3),
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingAdMetric" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "metricDate" TIMESTAMP(3) NOT NULL,
    "campaignId" TEXT,
    "clicks" INTEGER,
    "prints" INTEGER,
    "ctr" DOUBLE PRECISION,
    "cost" DOUBLE PRECISION,
    "cpc" DOUBLE PRECISION,
    "acos" DOUBLE PRECISION,
    "roas" DOUBLE PRECISION,
    "cvr" DOUBLE PRECISION,
    "sov" DOUBLE PRECISION,
    "directAmount" DOUBLE PRECISION,
    "indirectAmount" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "unitsQuantity" INTEGER,
    "directUnitsQuantity" INTEGER,
    "indirectUnitsQuantity" INTEGER,
    "advertisingItemsQuantity" INTEGER,
    "organicUnitsQuantity" INTEGER,
    "organicUnitsAmount" DOUBLE PRECISION,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingAdMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialPayment" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "listingId" TEXT,
    "productId" TEXT,
    "paymentId" TEXT NOT NULL,
    "externalReference" TEXT,
    "merchantOrderId" TEXT,
    "marketplaceOrderId" TEXT,
    "status" TEXT NOT NULL,
    "statusDetail" TEXT,
    "paymentMethodId" TEXT,
    "paymentTypeId" TEXT,
    "currencyId" TEXT,
    "transactionAmount" DOUBLE PRECISION NOT NULL,
    "totalPaidAmount" DOUBLE PRECISION,
    "netReceivedAmount" DOUBLE PRECISION,
    "shippingAmount" DOUBLE PRECISION,
    "marketplaceFeeAmount" DOUBLE PRECISION,
    "mercadopagoFeeAmount" DOUBLE PRECISION,
    "approvedAt" TIMESTAMP(3),
    "paymentCreatedAt" TIMESTAMP(3),
    "paymentUpdatedAt" TIMESTAMP(3),
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationWebhookEvent" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT,
    "provider" "IntegrationProvider" NOT NULL,
    "topic" TEXT NOT NULL,
    "resource" TEXT,
    "externalEventId" TEXT,
    "payloadJson" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnection_provider_externalUserId_key" ON "IntegrationConnection"("provider", "externalUserId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceListing_itemId_key" ON "MarketplaceListing"("itemId");

-- CreateIndex
CREATE INDEX "MarketplaceListing_connectionId_status_idx" ON "MarketplaceListing"("connectionId", "status");

-- CreateIndex
CREATE INDEX "MarketplaceListing_productId_idx" ON "MarketplaceListing"("productId");

-- CreateIndex
CREATE INDEX "ListingPromotion_connectionId_promotionType_idx" ON "ListingPromotion"("connectionId", "promotionType");

-- CreateIndex
CREATE UNIQUE INDEX "ListingPromotion_listingId_promotionId_key" ON "ListingPromotion"("listingId", "promotionId");

-- CreateIndex
CREATE INDEX "ListingAdMetric_connectionId_metricDate_idx" ON "ListingAdMetric"("connectionId", "metricDate");

-- CreateIndex
CREATE UNIQUE INDEX "ListingAdMetric_listingId_metricDate_campaignId_key" ON "ListingAdMetric"("listingId", "metricDate", "campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialPayment_paymentId_key" ON "FinancialPayment"("paymentId");

-- CreateIndex
CREATE INDEX "FinancialPayment_connectionId_paymentCreatedAt_idx" ON "FinancialPayment"("connectionId", "paymentCreatedAt");

-- CreateIndex
CREATE INDEX "FinancialPayment_listingId_idx" ON "FinancialPayment"("listingId");

-- CreateIndex
CREATE INDEX "FinancialPayment_productId_idx" ON "FinancialPayment"("productId");

-- CreateIndex
CREATE INDEX "IntegrationWebhookEvent_provider_topic_idx" ON "IntegrationWebhookEvent"("provider", "topic");

-- CreateIndex
CREATE INDEX "IntegrationWebhookEvent_externalEventId_idx" ON "IntegrationWebhookEvent"("externalEventId");

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPromotion" ADD CONSTRAINT "ListingPromotion_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPromotion" ADD CONSTRAINT "ListingPromotion_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingAdMetric" ADD CONSTRAINT "ListingAdMetric_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingAdMetric" ADD CONSTRAINT "ListingAdMetric_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialPayment" ADD CONSTRAINT "FinancialPayment_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialPayment" ADD CONSTRAINT "FinancialPayment_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialPayment" ADD CONSTRAINT "FinancialPayment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationWebhookEvent" ADD CONSTRAINT "IntegrationWebhookEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
