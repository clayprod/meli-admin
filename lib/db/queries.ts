import type { Prisma } from "@prisma/client";

import { calculatePricing } from "@/lib/pricing/calculate-pricing";
import { samplePricingInput } from "@/lib/pricing/reference-data";
import type { PricingAlert, PricingInput, PricingResultDraft } from "@/lib/pricing/types";

import { hasDatabaseUrl, prisma } from "./prisma";

type ResultStatusPayload = {
  freightStatus?: PricingResultDraft["freightStatus"];
  alerts?: PricingAlert[];
};

type DashboardScenarioRecord = Prisma.PricingScenarioGetPayload<{
  include: {
    product: true;
    batch: true;
    results: {
      orderBy: { calculatedAt: "desc" };
      take: 1;
    };
  };
}>;

type ProductListRecord = Prisma.ProductGetPayload<{
  include: {
    scenarios: {
      orderBy: { createdAt: "desc" };
      take: 1;
      include: {
        results: {
          orderBy: { calculatedAt: "desc" };
          take: 1;
        };
      };
    };
  };
}>;

type ScenarioListRecord = Prisma.PricingScenarioGetPayload<{
  include: {
    product: true;
    batch: true;
    results: {
      orderBy: { calculatedAt: "desc" };
      take: 1;
    };
  };
}>;

function readStatusPayload(input: unknown): ResultStatusPayload {
  if (!input || typeof input !== "object") {
    return {};
  }

  return input as ResultStatusPayload;
}

function buildFallbackRecord() {
  const result = calculatePricing(samplePricingInput);

  return {
    source: "fallback" as const,
    scenarioName: samplePricingInput.scenario.name,
    productName: samplePricingInput.product.name,
    productSku: samplePricingInput.product.sku,
    dimensionsLabel: `${samplePricingInput.product.lengthCm} x ${samplePricingInput.product.widthCm} x ${samplePricingInput.product.heightCm} cm`,
    quantity: samplePricingInput.purchase.quantity,
    unitCostWithIpi: samplePricingInput.purchase.unitCostWithIpi,
    taxSubstitution: samplePricingInput.purchase.taxSubstitution,
    result,
  };
}

function mapDashboardRecord(record: DashboardScenarioRecord | null) {
  if (!record || !record.batch || record.results.length === 0) {
    return buildFallbackRecord();
  }

  const latestResult = record.results[0];
  const statusPayload = readStatusPayload(latestResult.statusJson);

  return {
    source: "database" as const,
    scenarioId: record.id,
    scenarioName: record.name,
    productName: record.product.name,
    productSku: record.product.sku ?? "Sem SKU",
    dimensionsLabel: `${record.product.lengthCm} x ${record.product.widthCm} x ${record.product.heightCm} cm`,
    quantity: record.batch.quantity,
    unitCostWithIpi: record.batch.unitCostWithIpi,
    taxSubstitution: record.batch.taxSubstitution,
    result: {
      salePrice: latestResult.salePrice,
      freightCost: latestResult.freightCost,
      storageCostUnit: latestResult.storageCost,
      finalUnitCost: latestResult.finalUnitCost,
      grossMarginRate: latestResult.grossMarginRate,
      multiplier: latestResult.multiplier,
      netMarginAmount: latestResult.netMarginAmount,
      netMarginUnitAmount: latestResult.netMarginUnitAmount,
      roi: latestResult.roi,
      annualizedRoi: latestResult.annualizedRoi,
      revenueTotal: latestResult.revenueTotal,
      adsInvestment: latestResult.adsInvestment,
      freightStatus:
        statusPayload.freightStatus ?? buildFallbackRecord().result.freightStatus,
      alerts: statusPayload.alerts ?? [],
      selectedBandLabel:
        ((latestResult.candidateJson as Array<{ inBand?: boolean; bandLabel?: string }> | null)?.find(
          (candidate) => candidate?.inBand,
        )?.bandLabel ?? "Faixa indisponivel"),
    },
  };
}

export async function getDashboardData() {
  if (!hasDatabaseUrl()) {
    return buildFallbackRecord();
  }

  try {
    const latestScenario = await prisma.pricingScenario.findFirst({
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
        batch: true,
        results: {
          orderBy: { calculatedAt: "desc" },
          take: 1,
        },
      },
    });

    return mapDashboardRecord(latestScenario);
  } catch {
    return buildFallbackRecord();
  }
}

export async function getProductsData() {
  if (!hasDatabaseUrl()) {
    const fallback = buildFallbackRecord();

    return [
      {
        id: "fallback",
        name: fallback.productName,
        sku: fallback.productSku,
        weightKg: samplePricingInput.product.weightKg,
        dimensionsLabel: fallback.dimensionsLabel,
        salePrice: fallback.result.salePrice,
        active: true,
        source: fallback.source,
      },
    ];
  }

  try {
    const products = await prisma.product.findMany({
      orderBy: { updatedAt: "desc" },
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
    });

    return products.map((product: ProductListRecord) => ({
      id: product.id,
      name: product.name,
      sku: product.sku ?? "Sem SKU",
      weightKg: product.weightKg,
      dimensionsLabel: `${product.lengthCm} x ${product.widthCm} x ${product.heightCm} cm`,
      salePrice: product.scenarios[0]?.results[0]?.salePrice ?? null,
      active: product.active,
      source: "database" as const,
    }));
  } catch {
    return [
      {
        id: "fallback",
        name: samplePricingInput.product.name,
        sku: samplePricingInput.product.sku,
        weightKg: samplePricingInput.product.weightKg,
        dimensionsLabel: `${samplePricingInput.product.lengthCm} x ${samplePricingInput.product.widthCm} x ${samplePricingInput.product.heightCm} cm`,
        salePrice: calculatePricing(samplePricingInput).salePrice,
        active: true,
        source: "fallback" as const,
      },
    ];
  }
}

export async function getScenariosData() {
  if (!hasDatabaseUrl()) {
    const result = calculatePricing(samplePricingInput);

    return [
      {
        id: "fallback",
        name: samplePricingInput.scenario.name,
        productName: samplePricingInput.product.name,
        createdAt: new Date().toISOString(),
        salePrice: result.salePrice,
        roi: result.roi,
        netMarginUnitAmount: result.netMarginUnitAmount,
        freightStatus: result.freightStatus,
        source: "fallback" as const,
      },
    ];
  }

  try {
    const scenarios = await prisma.pricingScenario.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
        batch: true,
        results: {
          orderBy: { calculatedAt: "desc" },
          take: 1,
        },
      },
    });

    return scenarios.map((scenario: ScenarioListRecord) => {
      const latestResult = scenario.results[0];
      const statusPayload = readStatusPayload(latestResult?.statusJson);

      return {
        id: scenario.id,
        name: scenario.name,
        productName: scenario.product.name,
        createdAt: scenario.createdAt.toISOString(),
        salePrice: latestResult?.salePrice ?? 0,
        roi: latestResult?.roi ?? 0,
        netMarginUnitAmount: latestResult?.netMarginUnitAmount ?? 0,
        freightStatus:
          statusPayload.freightStatus ?? buildFallbackRecord().result.freightStatus,
        source: "database" as const,
      };
    });
  } catch {
    const result = calculatePricing(samplePricingInput);

    return [
      {
        id: "fallback",
        name: samplePricingInput.scenario.name,
        productName: samplePricingInput.product.name,
        createdAt: new Date().toISOString(),
        salePrice: result.salePrice,
        roi: result.roi,
        netMarginUnitAmount: result.netMarginUnitAmount,
        freightStatus: result.freightStatus,
        source: "fallback" as const,
      },
    ];
  }
}

export async function getRatesData() {
  if (!hasDatabaseUrl()) {
    const { defaultRates } = await import("@/lib/pricing/reference-data");

    return {
      freightRates: defaultRates.freightRates,
      fullStorageRates: defaultRates.fullStorageRates,
      source: "fallback" as const,
    };
  }

  try {
    const [freightRates, fullStorageRates] = await Promise.all([
      prisma.freightRate.findMany({
        orderBy: [{ priceBandMin: "asc" }, { minWeightKg: "asc" }],
        take: 18,
      }),
      prisma.fullStorageRate.findMany({
        orderBy: { dailyUnitRate: "asc" },
      }),
    ]);

    return {
      freightRates: freightRates.map((rate) => ({
        label: rate.label,
        priceBandMin: rate.priceBandMin,
        priceBandMax: rate.priceBandMax,
        freightCost: rate.freightCost,
        freightMode: rate.freightMode,
      })),
      fullStorageRates: fullStorageRates.map((rate) => ({
        sizeCategory: rate.sizeCategory,
        dailyUnitRate: rate.dailyUnitRate,
        agedStorageLabels: Array.isArray(rate.agedStorageLabels) ? rate.agedStorageLabels : [],
      })),
      source: "database" as const,
    };
  } catch {
    const { defaultRates } = await import("@/lib/pricing/reference-data");

    return {
      freightRates: defaultRates.freightRates,
      fullStorageRates: defaultRates.fullStorageRates,
      source: "fallback" as const,
    };
  }
}

export async function savePricingScenario(input: PricingInput) {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  const result = calculatePricing(input);

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.upsert({
      where: {
        sku: input.product.sku,
      },
      update: {
        name: input.product.name,
        weightKg: input.product.weightKg,
        lengthCm: input.product.lengthCm,
        widthCm: input.product.widthCm,
        heightCm: input.product.heightCm,
        active: true,
      },
      create: {
        name: input.product.name,
        sku: input.product.sku,
        weightKg: input.product.weightKg,
        lengthCm: input.product.lengthCm,
        widthCm: input.product.widthCm,
        heightCm: input.product.heightCm,
      },
    });

    const batch = await tx.purchaseBatch.create({
      data: {
        productId: product.id,
        quantity: input.purchase.quantity,
        unitCostWithIpi: input.purchase.unitCostWithIpi,
        taxSubstitution: input.purchase.taxSubstitution,
      },
    });

    const scenario = await tx.pricingScenario.create({
      data: {
        productId: product.id,
        batchId: batch.id,
        name: input.scenario.name,
        logisticsType: input.scenario.logisticsType,
        freightPayer: input.scenario.freightPayer,
        commissionRate: input.scenario.commissionRate,
        roas: input.scenario.roas,
        operationalCostRate: input.scenario.operationalCostRate,
        simpleTaxRate: input.scenario.simpleTaxRate,
        ownIcmsRate: input.scenario.ownIcmsRate,
        destinationIcmsRate: input.scenario.destinationIcmsRate,
        financialCostMonthlyRate: input.scenario.financialCostMonthlyRate,
        targetNetMarginRate: input.scenario.targetNetMarginRate,
        turnoverDays: input.scenario.turnoverDays,
      },
    });

    const savedResult = await tx.pricingResult.create({
      data: {
        scenarioId: scenario.id,
        salePrice: result.salePrice,
        freightCost: result.freightCost,
        storageCost: result.storageCostUnit,
        finalUnitCost: result.finalUnitCost,
        grossMarginRate: result.grossMarginRate,
        multiplier: result.multiplier,
        netMarginAmount: result.netMarginAmount,
        netMarginUnitAmount: result.netMarginUnitAmount,
        roi: result.roi,
        annualizedRoi: result.annualizedRoi,
        revenueTotal: result.revenueTotal,
        adsInvestment: result.adsInvestment,
        statusJson: {
          freightStatus: result.freightStatus,
          alerts: result.alerts,
        },
        candidateJson: result.candidateResults,
        ratesEffectiveFrom: new Date(result.ratesEffectiveFrom),
      },
    });

    await tx.auditLog.create({
      data: {
        entity: "PricingScenario",
        entityId: scenario.id,
        action: "create",
        afterJson: {
          scenarioId: scenario.id,
          resultId: savedResult.id,
          productId: product.id,
        },
      },
    });

    return {
      productId: product.id,
      scenarioId: scenario.id,
      resultId: savedResult.id,
      result,
    };
  });
}
