import { IntegrationProvider } from "@prisma/client";

import { hasDatabaseUrl, isDatabaseConnectionError, prisma } from "@/lib/db/prisma";

export type PeriodKey = "7d" | "30d" | "90d";

export const PERIOD_DAYS: Record<PeriodKey, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export const PERIOD_LABEL: Record<PeriodKey, string> = {
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
};

export type Delta = {
  current: number;
  previous: number;
  deltaPct: number | null;
};

export type DailyPoint = {
  date: string;
  revenue: number;
  netReceived: number;
  adCost: number;
  paymentsCount: number;
};

export type AttentionDetails = {
  lowStock: Array<{ id: string; itemId: string; title: string; availableQuantity: number; permalink: string | null }>;
  pausedListings: Array<{ id: string; itemId: string; title: string; permalink: string | null }>;
  pendingPayments: Array<{ paymentId: string; status: string; statusDetail: string | null; transactionAmount: number; createdAt: string | null }>;
};

export type DashboardOverview = {
  period: { key: PeriodKey; days: number; from: string; to: string; label: string };
  kpis: {
    revenue: Delta;
    netReceived: Delta;
    paymentsCount: Delta;
    averageTicket: Delta;
    adCost: Delta;
    roas: Delta;
    marketplaceFees: Delta;
    activeListings: number;
  };
  dailySeries: DailyPoint[];
  attention: {
    pendingPayments: number;
    pausedListings: number;
    lowStockListings: number;
    unansweredQuestions: number;
  };
  attentionDetails: AttentionDetails;
  topListings: Array<{ itemId: string; title: string; revenue: number; paymentCount: number; permalink: string | null }>;
  recentPayments: Array<{
    paymentId: string;
    listingTitle: string | null;
    listingItemId: string | null;
    transactionAmount: number;
    netReceivedAmount: number | null;
    status: string;
    approvedAt: string | null;
  }>;
};

const LOW_STOCK_THRESHOLD = 5;

const EMPTY: DashboardOverview = {
  period: { key: "30d", days: 30, from: new Date(0).toISOString(), to: new Date().toISOString(), label: PERIOD_LABEL["30d"] },
  kpis: {
    revenue: { current: 0, previous: 0, deltaPct: null },
    netReceived: { current: 0, previous: 0, deltaPct: null },
    paymentsCount: { current: 0, previous: 0, deltaPct: null },
    averageTicket: { current: 0, previous: 0, deltaPct: null },
    adCost: { current: 0, previous: 0, deltaPct: null },
    roas: { current: 0, previous: 0, deltaPct: null },
    marketplaceFees: { current: 0, previous: 0, deltaPct: null },
    activeListings: 0,
  },
  dailySeries: [],
  attention: { pendingPayments: 0, pausedListings: 0, lowStockListings: 0, unansweredQuestions: 0 },
  attentionDetails: { lowStock: [], pausedListings: [], pendingPayments: [] },
  topListings: [],
  recentPayments: [],
};

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function buildDelta(current: number, previous: number): Delta {
  return { current, previous, deltaPct: deltaPct(current, previous) };
}

export async function getDashboardOverview(orgId: string, periodKey: PeriodKey = "30d"): Promise<DashboardOverview> {
  if (!hasDatabaseUrl()) return EMPTY;

  try {
    const days = PERIOD_DAYS[periodKey];
    const now = new Date();
    const periodTo = now;
    const periodFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const priorFrom = new Date(periodFrom.getTime() - days * 24 * 60 * 60 * 1000);

    const [paymentsCurrent, paymentsPrior, adMetricsCurrent, adMetricsPrior, listingStats, pendingPaymentDetails, lowStockDetails, pausedListingDetails, recentQuestions, recentPaymentsRaw] = await Promise.all([
      prisma.financialPayment.findMany({
        where: { connection: { orgId }, paymentCreatedAt: { gte: periodFrom, lte: periodTo } },
        select: {
          paymentId: true,
          status: true,
          transactionAmount: true,
          netReceivedAmount: true,
          marketplaceFeeAmount: true,
          mercadopagoFeeAmount: true,
          paymentCreatedAt: true,
          listingId: true,
          listing: { select: { title: true, itemId: true, permalink: true } },
        },
        orderBy: { paymentCreatedAt: "desc" },
      }),
      prisma.financialPayment.findMany({
        where: { connection: { orgId }, paymentCreatedAt: { gte: priorFrom, lt: periodFrom } },
        select: {
          status: true,
          transactionAmount: true,
          netReceivedAmount: true,
          marketplaceFeeAmount: true,
          mercadopagoFeeAmount: true,
        },
      }),
      prisma.listingAdMetric.findMany({
        where: { connection: { orgId }, metricDate: { gte: periodFrom, lte: periodTo } },
        select: { cost: true, totalAmount: true, metricDate: true },
      }),
      prisma.listingAdMetric.findMany({
        where: { connection: { orgId }, metricDate: { gte: priorFrom, lt: periodFrom } },
        select: { cost: true, totalAmount: true },
      }),
      prisma.marketplaceListing.groupBy({
        where: { connection: { orgId } },
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.financialPayment.findMany({
        where: {
          connection: { orgId },
          status: { in: ["pending", "in_process", "in_mediation"] },
          paymentCreatedAt: { gte: periodFrom },
        },
        select: { paymentId: true, status: true, statusDetail: true, transactionAmount: true, paymentCreatedAt: true },
        orderBy: { paymentCreatedAt: "desc" },
        take: 10,
      }),
      prisma.marketplaceListing.findMany({
        where: { connection: { orgId }, status: "active", availableQuantity: { lt: LOW_STOCK_THRESHOLD } },
        select: { id: true, itemId: true, title: true, availableQuantity: true, permalink: true },
        orderBy: { availableQuantity: "asc" },
        take: 10,
      }),
      prisma.marketplaceListing.findMany({
        where: { connection: { orgId }, status: "paused" },
        select: { id: true, itemId: true, title: true, permalink: true },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.integrationWebhookEvent.count({
        where: {
          provider: IntegrationProvider.MERCADO_LIVRE,
          topic: { startsWith: "questions" },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.financialPayment.findMany({
        where: { connection: { orgId } },
        select: {
          paymentId: true,
          status: true,
          transactionAmount: true,
          netReceivedAmount: true,
          approvedAt: true,
          listing: { select: { title: true, itemId: true } },
        },
        orderBy: { paymentCreatedAt: "desc" },
        take: 8,
      }),
    ]);

    const sumTx = (rows: Array<{ transactionAmount: number }>) => rows.reduce((acc, r) => acc + r.transactionAmount, 0);
    const sumNet = (rows: Array<{ netReceivedAmount: number | null }>) => rows.reduce((acc, r) => acc + (r.netReceivedAmount ?? 0), 0);
    const sumFees = (rows: Array<{ marketplaceFeeAmount: number | null; mercadopagoFeeAmount: number | null }>) =>
      rows.reduce((acc, r) => acc + (r.marketplaceFeeAmount ?? 0) + (r.mercadopagoFeeAmount ?? 0), 0);
    const sumCost = (rows: Array<{ cost: number | null }>) => rows.reduce((acc, r) => acc + (r.cost ?? 0), 0);

    const revenueCurrent = sumTx(paymentsCurrent);
    const revenuePrior = sumTx(paymentsPrior);
    const netCurrent = sumNet(paymentsCurrent);
    const netPrior = sumNet(paymentsPrior);
    const feesCurrent = sumFees(paymentsCurrent);
    const feesPrior = sumFees(paymentsPrior);
    const adCostCurrent = sumCost(adMetricsCurrent);
    const adCostPrior = sumCost(adMetricsPrior);

    const countCurrent = paymentsCurrent.length;
    const countPrior = paymentsPrior.length;
    const ticketCurrent = countCurrent > 0 ? revenueCurrent / countCurrent : 0;
    const ticketPrior = countPrior > 0 ? revenuePrior / countPrior : 0;

    const roasCurrent = adCostCurrent > 0 ? revenueCurrent / adCostCurrent : 0;
    const roasPrior = adCostPrior > 0 ? revenuePrior / adCostPrior : 0;

    const dailyMap = new Map<string, DailyPoint>();
    for (let i = 0; i < days; i++) {
      const d = new Date(periodFrom.getTime() + i * 24 * 60 * 60 * 1000);
      const key = dayKey(d);
      dailyMap.set(key, { date: key, revenue: 0, netReceived: 0, adCost: 0, paymentsCount: 0 });
    }
    for (const p of paymentsCurrent) {
      if (!p.paymentCreatedAt) continue;
      const key = dayKey(p.paymentCreatedAt);
      const point = dailyMap.get(key);
      if (!point) continue;
      point.revenue += p.transactionAmount;
      point.netReceived += p.netReceivedAmount ?? 0;
      point.paymentsCount += 1;
    }
    for (const m of adMetricsCurrent) {
      const key = dayKey(m.metricDate);
      const point = dailyMap.get(key);
      if (!point) continue;
      point.adCost += m.cost ?? 0;
    }
    const dailySeries = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const activeListings = listingStats.find((row) => row.status === "active")?._count._all ?? 0;
    const pausedCount = listingStats.find((row) => row.status === "paused")?._count._all ?? 0;

    const lowStockCount = await prisma.marketplaceListing.count({
      where: { connection: { orgId }, status: "active", availableQuantity: { lt: LOW_STOCK_THRESHOLD } },
    });

    const pendingCount = await prisma.financialPayment.count({
      where: { connection: { orgId }, status: { in: ["pending", "in_process", "in_mediation"] } },
    });

    const byListing = new Map<string, { itemId: string; title: string; revenue: number; paymentCount: number; permalink: string | null }>();
    for (const p of paymentsCurrent) {
      if (!p.listing) continue;
      const current = byListing.get(p.listingId ?? p.listing.itemId) ?? {
        itemId: p.listing.itemId,
        title: p.listing.title,
        permalink: p.listing.permalink,
        revenue: 0,
        paymentCount: 0,
      };
      current.revenue += p.transactionAmount;
      current.paymentCount += 1;
      byListing.set(p.listingId ?? p.listing.itemId, current);
    }
    const topListings = Array.from(byListing.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    return {
      period: { key: periodKey, days, from: periodFrom.toISOString(), to: periodTo.toISOString(), label: PERIOD_LABEL[periodKey] },
      kpis: {
        revenue: buildDelta(revenueCurrent, revenuePrior),
        netReceived: buildDelta(netCurrent, netPrior),
        paymentsCount: buildDelta(countCurrent, countPrior),
        averageTicket: buildDelta(ticketCurrent, ticketPrior),
        adCost: buildDelta(adCostCurrent, adCostPrior),
        roas: buildDelta(roasCurrent, roasPrior),
        marketplaceFees: buildDelta(feesCurrent, feesPrior),
        activeListings,
      },
      dailySeries,
      attention: {
        pendingPayments: pendingCount,
        pausedListings: pausedCount,
        lowStockListings: lowStockCount,
        unansweredQuestions: recentQuestions,
      },
      attentionDetails: {
        lowStock: lowStockDetails.map((l) => ({
          id: l.id,
          itemId: l.itemId,
          title: l.title,
          availableQuantity: l.availableQuantity ?? 0,
          permalink: l.permalink,
        })),
        pausedListings: pausedListingDetails.map((l) => ({
          id: l.id,
          itemId: l.itemId,
          title: l.title,
          permalink: l.permalink,
        })),
        pendingPayments: pendingPaymentDetails.map((p) => ({
          paymentId: p.paymentId,
          status: p.status,
          statusDetail: p.statusDetail,
          transactionAmount: p.transactionAmount,
          createdAt: p.paymentCreatedAt?.toISOString() ?? null,
        })),
      },
      topListings,
      recentPayments: recentPaymentsRaw.map((p) => ({
        paymentId: p.paymentId,
        listingTitle: p.listing?.title ?? null,
        listingItemId: p.listing?.itemId ?? null,
        transactionAmount: p.transactionAmount,
        netReceivedAmount: p.netReceivedAmount,
        status: p.status,
        approvedAt: p.approvedAt?.toISOString() ?? null,
      })),
    };
  } catch (error) {
    if (isDatabaseConnectionError(error)) return EMPTY;
    throw error;
  }
}
