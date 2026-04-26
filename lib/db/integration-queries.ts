import { IntegrationProvider } from "@prisma/client";

import { hasDatabaseUrl, prisma } from "@/lib/db/prisma";
import { getIntegrationEnvStatus } from "@/lib/integrations/env";

export async function getIntegrationOverview() {
  const envStatus = getIntegrationEnvStatus();

  if (!hasDatabaseUrl()) {
    return {
      envStatus,
      connections: [],
      listingCount: 0,
      promotionCount: 0,
      adMetricCount: 0,
      paymentCount: 0,
    };
  }

  const [connections, listingCount, promotionCount, adMetricCount, paymentCount] =
    await Promise.all([
      prisma.integrationConnection.findMany({
        orderBy: [{ provider: "asc" }, { updatedAt: "desc" }],
      }),
      prisma.marketplaceListing.count(),
      prisma.listingPromotion.count(),
      prisma.listingAdMetric.count(),
      prisma.financialPayment.count(),
    ]);

  return {
    envStatus,
    connections,
    listingCount,
    promotionCount,
    adMetricCount,
    paymentCount,
  };
}

export async function getMarketplaceListingsOverview() {
  if (!hasDatabaseUrl()) {
    return {
      listings: [],
      products: [],
      connectionAvailable: false,
    };
  }

  const [listings, products, connectionAvailable] = await Promise.all([
    prisma.marketplaceListing.findMany({
      include: {
        product: {
          include: {
            scenarios: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                results: {
                  orderBy: { calculatedAt: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
        promotions: {
          orderBy: { updatedAt: "desc" },
          take: 3,
        },
        adMetrics: {
          orderBy: { metricDate: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, sku: true },
    }),
    prisma.integrationConnection.count({ where: { provider: IntegrationProvider.MERCADO_LIVRE } }),
  ]);

  return {
    listings: listings.map((listing) => ({
      id: listing.id,
      itemId: listing.itemId,
      title: listing.title,
      status: listing.status,
      listingTypeId: listing.listingTypeId,
      logisticType: listing.logisticType,
      price: listing.price,
      originalPrice: listing.originalPrice,
      availableQuantity: listing.availableQuantity,
      soldQuantity: listing.soldQuantity,
      thumbnail: listing.thumbnail,
      permalink: listing.permalink,
      productId: listing.productId,
      productName: listing.product?.name ?? null,
      productSku: listing.product?.sku ?? null,
      suggestedPrice: listing.product?.scenarios[0]?.results[0]?.salePrice ?? null,
      activePromotions: listing.promotions.length,
      latestAdCost: listing.adMetrics[0]?.cost ?? null,
      lastSyncedAt: listing.lastSyncedAt?.toISOString() ?? null,
    })),
    products,
    connectionAvailable: connectionAvailable > 0,
  };
}

export async function getPromotionsOverview() {
  if (!hasDatabaseUrl()) {
    return { promotions: [], automaticExclusionHint: true };
  }

  const promotions = await prisma.listingPromotion.findMany({
    include: {
      listing: {
        include: {
          product: true,
        },
      },
    },
    orderBy: [{ startDate: "desc" }, { updatedAt: "desc" }],
    take: 100,
  });

  return {
    promotions: promotions.map((promotion) => ({
      id: promotion.id,
      promotionId: promotion.promotionId,
      type: promotion.promotionType,
      subType: promotion.subType,
      status: promotion.status,
      name: promotion.name,
      dealPrice: promotion.dealPrice,
      originalPrice: promotion.originalPrice,
      sellerPercentage: promotion.sellerPercentage,
      meliPercentage: promotion.meliPercentage,
      startDate: promotion.startDate?.toISOString() ?? null,
      finishDate: promotion.finishDate?.toISOString() ?? null,
      listingTitle: promotion.listing.title,
      itemId: promotion.listing.itemId,
      productName: promotion.listing.product?.name ?? null,
    })),
    automaticExclusionHint: true,
  };
}

export async function getAdvertisingOverview() {
  if (!hasDatabaseUrl()) {
    return { rows: [], totals: null };
  }

  const metrics = await prisma.listingAdMetric.findMany({
    include: {
      listing: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { metricDate: "desc" },
    take: 200,
  });

  const grouped = new Map<string, {
    itemId: string;
    title: string;
    productName: string | null;
    clicks: number;
    impressions: number;
    cost: number;
    totalAmount: number;
    roas: number | null;
    acos: number | null;
    lastDate: string;
  }>();

  metrics.forEach((row) => {
    const key = row.listingId;
    const current = grouped.get(key) ?? {
      itemId: row.listing.itemId,
      title: row.listing.title,
      productName: row.listing.product?.name ?? null,
      clicks: 0,
      impressions: 0,
      cost: 0,
      totalAmount: 0,
      roas: null,
      acos: null,
      lastDate: row.metricDate.toISOString(),
    };

    current.clicks += row.clicks ?? 0;
    current.impressions += row.prints ?? 0;
    current.cost += row.cost ?? 0;
    current.totalAmount += row.totalAmount ?? 0;
    current.roas = row.roas ?? current.roas;
    current.acos = row.acos ?? current.acos;
    current.lastDate = current.lastDate > row.metricDate.toISOString() ? current.lastDate : row.metricDate.toISOString();
    grouped.set(key, current);
  });

  const rows = Array.from(grouped.values()).sort((left, right) => right.cost - left.cost);
  const totals = rows.reduce(
    (acc, row) => ({
      clicks: acc.clicks + row.clicks,
      impressions: acc.impressions + row.impressions,
      cost: acc.cost + row.cost,
      totalAmount: acc.totalAmount + row.totalAmount,
    }),
    { clicks: 0, impressions: 0, cost: 0, totalAmount: 0 },
  );

  return { rows, totals };
}

export async function getFinanceOverview() {
  if (!hasDatabaseUrl()) {
    return { payments: [], totals: null };
  }

  const payments = await prisma.financialPayment.findMany({
    include: {
      listing: true,
      product: true,
    },
    orderBy: { paymentCreatedAt: "desc" },
    take: 100,
  });

  const totals = payments.reduce(
    (acc, payment) => ({
      transactionAmount: acc.transactionAmount + payment.transactionAmount,
      netReceivedAmount: acc.netReceivedAmount + (payment.netReceivedAmount ?? 0),
      marketplaceFeeAmount: acc.marketplaceFeeAmount + (payment.marketplaceFeeAmount ?? 0),
      mercadopagoFeeAmount: acc.mercadopagoFeeAmount + (payment.mercadopagoFeeAmount ?? 0),
    }),
    {
      transactionAmount: 0,
      netReceivedAmount: 0,
      marketplaceFeeAmount: 0,
      mercadopagoFeeAmount: 0,
    },
  );

  return {
    payments: payments.map((payment) => ({
      id: payment.id,
      paymentId: payment.paymentId,
      status: payment.status,
      statusDetail: payment.statusDetail,
      externalReference: payment.externalReference,
      transactionAmount: payment.transactionAmount,
      totalPaidAmount: payment.totalPaidAmount,
      netReceivedAmount: payment.netReceivedAmount,
      marketplaceFeeAmount: payment.marketplaceFeeAmount,
      mercadopagoFeeAmount: payment.mercadopagoFeeAmount,
      listingTitle: payment.listing?.title ?? null,
      productName: payment.product?.name ?? null,
      paymentCreatedAt: payment.paymentCreatedAt?.toISOString() ?? null,
      approvedAt: payment.approvedAt?.toISOString() ?? null,
    })),
    totals,
  };
}

export async function linkProductToListing(listingId: string, productId: string | null) {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  const listing = await prisma.marketplaceListing.update({
    where: { id: listingId },
    data: {
      productId,
    },
  });

  await prisma.auditLog.create({
    data: {
      entity: "MarketplaceListing",
      entityId: listing.id,
      action: productId ? "link-product" : "unlink-product",
      afterJson: {
        productId,
      },
    },
  });

  return listing;
}
