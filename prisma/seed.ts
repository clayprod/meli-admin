import { PrismaClient } from "@prisma/client";

import { calculatePricing } from "../lib/pricing/calculate-pricing";
import { defaultRates, samplePricingInput } from "../lib/pricing/reference-data";

const prisma = new PrismaClient();

const DEFAULT_ORG_ID = "org_default_tenryu";
const DEFAULT_ORG_SLUG = "tenryu";
const DEFAULT_ORG_NAME = "Tenryu";

async function main() {
  await prisma.pricingResult.deleteMany();
  await prisma.pricingScenario.deleteMany();
  await prisma.purchaseBatch.deleteMany();
  await prisma.product.deleteMany();
  await prisma.freightRate.deleteMany();
  await prisma.fullStorageRate.deleteMany();

  await prisma.org.upsert({
    where: { id: DEFAULT_ORG_ID },
    update: {},
    create: {
      id: DEFAULT_ORG_ID,
      name: DEFAULT_ORG_NAME,
      slug: DEFAULT_ORG_SLUG,
      taxRegime: "SIMPLES_NACIONAL",
      simplesAnexo: "I",
    },
  });

  await prisma.freightRate.createMany({
    data: defaultRates.freightRates.map((rate) => ({
      label: rate.label,
      minWeightKg: rate.minWeightKg,
      maxWeightKg: rate.maxWeightKg,
      priceBandMin: rate.priceBandMin,
      priceBandMax: rate.priceBandMax,
      freightCost: rate.freightCost,
      freightMode: rate.freightMode,
      effectiveFrom: new Date(rate.effectiveFrom),
      sourceUrl: rate.sourceUrl,
    })),
  });

  await prisma.fullStorageRate.createMany({
    data: defaultRates.fullStorageRates.map((rate) => ({
      sizeCategory: rate.sizeCategory,
      maxLengthCm: rate.maxLengthCm,
      maxWidthCm: rate.maxWidthCm,
      maxHeightCm: rate.maxHeightCm,
      maxWeightKg: rate.maxWeightKg,
      dailyUnitRate: rate.dailyUnitRate,
      effectiveFrom: new Date(rate.effectiveFrom),
      agedStorageLabels: rate.agedStorageLabels,
    })),
  });

  const product = await prisma.product.create({
    data: {
      orgId: DEFAULT_ORG_ID,
      name: samplePricingInput.product.name,
      sku: samplePricingInput.product.sku,
      weightKg: samplePricingInput.product.weightKg,
      lengthCm: samplePricingInput.product.lengthCm,
      widthCm: samplePricingInput.product.widthCm,
      heightCm: samplePricingInput.product.heightCm,
    },
  });

  const batch = await prisma.purchaseBatch.create({
    data: {
      productId: product.id,
      quantity: samplePricingInput.purchase.quantity,
      unitCostWithIpi: samplePricingInput.purchase.unitCostWithIpi,
      taxSubstitution: samplePricingInput.purchase.taxSubstitution,
    },
  });

  const scenario = await prisma.pricingScenario.create({
    data: {
      productId: product.id,
      batchId: batch.id,
      name: samplePricingInput.scenario.name,
      logisticsType: samplePricingInput.scenario.fulfillmentMode,
      freightPayer: samplePricingInput.scenario.ownDeliveryCost > 0 ? "VENDEDOR" : "PLATAFORMA",
      commissionRate: samplePricingInput.scenario.commissionRate,
      roas: samplePricingInput.scenario.roas,
      operationalCostRate: samplePricingInput.scenario.operationalCostRate,
      simpleTaxRate: samplePricingInput.scenario.simpleTaxRate,
      ownIcmsRate: samplePricingInput.scenario.ownIcmsRate,
      destinationIcmsRate: samplePricingInput.scenario.destinationIcmsRate,
      financialCostMonthlyRate: samplePricingInput.scenario.financialCostMonthlyRate,
      targetNetMarginRate: samplePricingInput.scenario.targetNetMarginRate,
      turnoverDays: samplePricingInput.scenario.turnoverDays,
    },
  });

  const result = calculatePricing(samplePricingInput, defaultRates);

  await prisma.pricingResult.create({
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
        scenarioContext: {
          listingType: samplePricingInput.scenario.listingType,
          fulfillmentMode: samplePricingInput.scenario.fulfillmentMode,
          marketplaceShippingCost: samplePricingInput.scenario.marketplaceShippingCost,
          marketplaceShippingRebate: samplePricingInput.scenario.marketplaceShippingRebate,
          ownDeliveryCost: samplePricingInput.scenario.ownDeliveryCost,
        },
      },
      candidateJson: result.candidateResults,
      ratesEffectiveFrom: new Date(result.ratesEffectiveFrom),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
