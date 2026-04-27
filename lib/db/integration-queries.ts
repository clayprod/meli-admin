import { IntegrationProvider } from "@prisma/client";

import { hasDatabaseUrl, isDatabaseConnectionError, prisma } from "@/lib/db/prisma";
import { getIntegrationEnvStatus } from "@/lib/integrations/env";

async function withDatabaseReadFallback<T>(fallback: T, query: () => Promise<T>): Promise<T> {
  if (!hasDatabaseUrl()) {
    return fallback;
  }

  try {
    return await query();
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return fallback;
    }

    throw error;
  }
}

type AdvertisingOverview = {
  rows: Array<{
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
  }>;
  totals: {
    clicks: number;
    impressions: number;
    cost: number;
    totalAmount: number;
  } | null;
};

type FinanceOverview = {
  payments: Array<{
    id: string;
    paymentId: string;
    status: string;
    statusDetail: string | null;
    externalReference: string | null;
    transactionAmount: number;
    totalPaidAmount: number | null;
    netReceivedAmount: number | null;
    marketplaceFeeAmount: number | null;
    mercadopagoFeeAmount: number | null;
    listingTitle: string | null;
    productName: string | null;
    paymentCreatedAt: string | null;
    approvedAt: string | null;
  }>;
  totals: {
    transactionAmount: number;
    netReceivedAmount: number;
    marketplaceFeeAmount: number;
    mercadopagoFeeAmount: number;
  } | null;
};

export async function getIntegrationOverview() {
  const envStatus = getIntegrationEnvStatus();

  return withDatabaseReadFallback(
    {
      envStatus,
      connections: [],
      listingCount: 0,
      promotionCount: 0,
      adMetricCount: 0,
      paymentCount: 0,
    },
    async () => {
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
    },
  );
}

export async function getMarketplaceListingsOverview() {
  return withDatabaseReadFallback(
    {
      listings: [],
      products: [],
      connectionAvailable: false,
    },
    async () => {
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
    },
  );
}

export async function getPromotionsOverview() {
  return withDatabaseReadFallback(
    { promotions: [], automaticExclusionHint: true },
    async () => {
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
    },
  );
}

export async function getAdvertisingOverview(): Promise<AdvertisingOverview> {
  return withDatabaseReadFallback<AdvertisingOverview>(
    { rows: [], totals: null },
    async () => {
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
    },
  );
}

export async function getFinanceOverview(): Promise<FinanceOverview> {
  return withDatabaseReadFallback<FinanceOverview>(
    { payments: [], totals: null },
    async () => {
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
    },
  );
}

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

function weekLabel(key: string): string {
  const [, week] = key.split("-");
  return `Sem ${Number(week)}`;
}

type WeeklySeries = { weekLabel: string; gmv: number; net: number; fees: number };

export async function getFinanceDashboardData(): Promise<{
  weeklySeries: WeeklySeries[];
  totals: { gmv: number; net: number; marketplaceFees: number; activeListings: number };
  topListings: { title: string; itemId: string; revenue: number; paymentCount: number }[];
  recentPayments: {
    paymentId: string;
    listingTitle: string | null;
    transactionAmount: number;
    netReceivedAmount: number | null;
    status: string;
    approvedAt: string | null;
  }[];
}> {
  const empty = {
    weeklySeries: [],
    totals: { gmv: 0, net: 0, marketplaceFees: 0, activeListings: 0 },
    topListings: [],
    recentPayments: [],
  };

  return withDatabaseReadFallback(empty, async () => {
    const since = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000);

    const [payments, activeListings] = await Promise.all([
      prisma.financialPayment.findMany({
        where: { approvedAt: { gte: since } },
        include: { listing: { select: { title: true, itemId: true } } },
        orderBy: { approvedAt: "desc" },
      }),
      prisma.marketplaceListing.count({ where: { status: "active" } }),
    ]);

    const weekMap = new Map<string, WeeklySeries>();
    for (const p of payments) {
      const date = p.approvedAt ?? p.paymentCreatedAt;
      if (!date) continue;
      const key = isoWeekKey(date);
      const current = weekMap.get(key) ?? { weekLabel: weekLabel(key), gmv: 0, net: 0, fees: 0 };
      current.gmv += p.transactionAmount;
      current.net += p.netReceivedAmount ?? 0;
      current.fees += (p.marketplaceFeeAmount ?? 0) + (p.mercadopagoFeeAmount ?? 0);
      weekMap.set(key, current);
    }

    const weeklySeries = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([, value]) => value);

    const totals = payments.reduce(
      (acc, p) => ({
        gmv: acc.gmv + p.transactionAmount,
        net: acc.net + (p.netReceivedAmount ?? 0),
        marketplaceFees: acc.marketplaceFees + (p.marketplaceFeeAmount ?? 0),
        activeListings,
      }),
      { gmv: 0, net: 0, marketplaceFees: 0, activeListings },
    );

    const byListing = new Map<string, { title: string; itemId: string; revenue: number; paymentCount: number }>();
    for (const p of payments) {
      if (!p.listing) continue;
      const current = byListing.get(p.listingId ?? "") ?? {
        title: p.listing.title,
        itemId: p.listing.itemId,
        revenue: 0,
        paymentCount: 0,
      };
      current.revenue += p.transactionAmount;
      current.paymentCount += 1;
      byListing.set(p.listingId ?? p.paymentId, current);
    }

    const topListings = Array.from(byListing.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const recentPayments = payments.slice(0, 8).map((p) => ({
      paymentId: p.paymentId,
      listingTitle: p.listing?.title ?? null,
      transactionAmount: p.transactionAmount,
      netReceivedAmount: p.netReceivedAmount,
      status: p.status,
      approvedAt: p.approvedAt?.toISOString() ?? null,
    }));

    return { weeklySeries, totals, topListings, recentPayments };
  });
}

export async function getMarketplaceListingsMinimal() {
  return withDatabaseReadFallback([], async () => {
    const listings = await prisma.marketplaceListing.findMany({
      select: {
        id: true,
        itemId: true,
        title: true,
        price: true,
        listingTypeId: true,
        siteId: true,
        categoryId: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    return listings;
  });
}

export async function linkProductToListing(listingId: string, productId: string | null) {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  try {
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
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      throw new Error("Banco indisponivel no momento. Verifique se o Postgres esta rodando.");
    }

    throw error;
  }
}
