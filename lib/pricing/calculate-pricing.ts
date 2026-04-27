import { defaultRates, priceBands, samplePricingInput } from "@/lib/pricing/reference-data";
import type {
  FreightCandidate,
  FreightStatus,
  FullStorageRate,
  PricingAlert,
  PricingInput,
  PricingRates,
  PricingResultDraft,
  SizeCategory,
} from "@/lib/pricing/types";

function assertPositive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} precisa ser maior que zero.`);
  }
}

function assertNonNegative(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} nao pode ser negativo.`);
  }
}

function assertRate(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new Error(`${label} precisa ficar entre 0 e 1.`);
  }
}

function classifyProductSize(
  lengthCm: number,
  widthCm: number,
  heightCm: number,
  weightKg: number,
): SizeCategory {
  if (lengthCm <= 25 && widthCm <= 15 && heightCm <= 12 && weightKg <= 18) {
    return "PEQUENO";
  }

  if (lengthCm <= 51 && widthCm <= 36 && heightCm <= 28 && weightKg <= 18) {
    return "MEDIO";
  }

  if (lengthCm <= 60 && widthCm <= 60 && heightCm <= 70 && weightKg <= 18) {
    return "GRANDE";
  }

  return "EXTRAGRANDE";
}

function getStorageRate(sizeCategory: SizeCategory, rates: FullStorageRate[]) {
  const rate = rates.find((entry) => entry.sizeCategory === sizeCategory);

  if (!rate) {
    throw new Error("Tarifa de armazenagem Full nao encontrada para o tamanho informado.");
  }

  return rate;
}

function getStorageCostUnit(input: PricingInput, rates: PricingRates, sizeCategory: SizeCategory) {
  if (input.scenario.fulfillmentMode !== "FULL") {
    return 0;
  }

  const storageRate = getStorageRate(sizeCategory, rates.fullStorageRates);
  return storageRate.dailyUnitRate * (input.scenario.turnoverDays / 2);
}

function getNetFreightCost(input: PricingInput) {
  return (
    input.scenario.marketplaceShippingCost +
    input.scenario.ownDeliveryCost -
    input.scenario.marketplaceShippingRebate
  );
}

function getScenarioLabel(input: PricingInput) {
  const fulfillmentLabel =
    input.scenario.fulfillmentMode === "FULL"
      ? "Full"
      : input.scenario.fulfillmentMode === "FLEX"
        ? "Flex"
        : "Logistica propria";
  const listingLabel = input.scenario.listingType === "PREMIUM" ? "Premium" : "Classico";

  return `${fulfillmentLabel} · ${listingLabel}`;
}

function getFreightStatus(input: PricingInput): FreightStatus {
  if (input.scenario.fulfillmentMode === "FULL") {
    return {
      code: "FULL_MERCADO_LIVRE",
      label: "Full Mercado Livre",
      tone: "success",
    };
  }

  if (input.scenario.fulfillmentMode === "FLEX") {
    return {
      code: input.scenario.marketplaceShippingRebate > 0 ? "FLEX_COM_REPASSE" : "FLEX_SEM_REPASSE",
      label:
        input.scenario.marketplaceShippingRebate > 0
          ? "Flex com repasse ML"
          : "Flex sem repasse ML",
      tone: input.scenario.marketplaceShippingRebate > 0 ? "success" : "warning",
    };
  }

  return {
    code: "LOGISTICA_PROPRIA",
    label: "Logistica propria",
    tone: "neutral",
  };
}

function buildCandidateResults(input: PricingInput, salePrice: number, freightCost: number): FreightCandidate[] {
  return [
    {
      bandLabel: getScenarioLabel(input),
      priceBandMin: salePrice,
      priceBandMax: salePrice,
      freightCost,
      salePrice,
      inBand: true,
    },
  ];
}

function buildAlerts(result: PricingResultDraft, input: PricingInput): PricingAlert[] {
  const alerts: PricingAlert[] = [];

  if (result.roi < 0.16) {
    alerts.push({
      code: "LOW_ROI",
      severity: "warning",
      title: "ROI abaixo da meta",
      description: "O retorno do lote ficou apertado para o capital investido.",
    });
  }

  if (input.scenario.targetNetMarginRate < 0.05) {
    alerts.push({
      code: "LOW_MARGIN_TARGET",
      severity: "warning",
      title: "Margem alvo agressiva",
      description: "A margem liquida configurada esta abaixo de 5%.",
    });
  }

  if (
    input.scenario.fulfillmentMode === "FLEX" &&
    input.scenario.ownDeliveryCost > 0 &&
    input.scenario.marketplaceShippingRebate < input.scenario.ownDeliveryCost
  ) {
    alerts.push({
      code: "FLEX_REBATE_GAP",
      severity: "warning",
      title: "Repasse do Flex abaixo do custo proprio",
      description: "O valor devolvido pelo Mercado Livre nao cobre toda a sua entrega.",
    });
  }

  if (result.netMarginUnitAmount < 0) {
    alerts.push({
      code: "NEGATIVE_MARGIN",
      severity: "critical",
      title: "Margem negativa",
      description: "O cenario calculado perde dinheiro por unidade vendida.",
    });
  }

  if (result.sizeCategory === "GRANDE" || result.sizeCategory === "EXTRAGRANDE") {
    alerts.push({
      code: "SIZE_REVIEW",
      severity: "info",
      title: "Revisar classificacao de tamanho",
      description: "A spec marca a regra de tamanho como ponto de atencao para produtos maiores.",
    });
  }

  return alerts;
}

function validatePricingInput(input: PricingInput) {
  assertPositive(input.product.weightKg, "Peso");
  assertPositive(input.product.lengthCm, "Comprimento");
  assertPositive(input.product.widthCm, "Largura");
  assertPositive(input.product.heightCm, "Altura");
  assertPositive(input.purchase.quantity, "Quantidade");
  assertPositive(input.scenario.turnoverDays, "Giro");
  assertPositive(input.scenario.roas, "ROAS");
  assertRate(input.scenario.commissionRate, "Comissao");
  assertRate(input.scenario.operationalCostRate, "Custo operacional");
  assertRate(input.scenario.simpleTaxRate, "Impostos simples");
  assertRate(input.scenario.ownIcmsRate, "ICMS proprio");
  assertRate(input.scenario.destinationIcmsRate, "ICMS destino");
  assertRate(input.scenario.financialCostMonthlyRate, "Custo financeiro mensal");
  assertNonNegative(input.scenario.marketplaceShippingCost, "Custo de frete da plataforma");
  assertNonNegative(input.scenario.marketplaceShippingRebate, "Repasse de frete da plataforma");
  assertNonNegative(input.scenario.ownDeliveryCost, "Custo proprio de entrega");
}

function buildPricingContext(input: PricingInput, rates: PricingRates) {
  validatePricingInput(input);

  const costTotal =
    input.purchase.unitCostWithIpi * input.purchase.quantity + input.purchase.taxSubstitution;
  const finalUnitCost = costTotal / input.purchase.quantity;
  const sizeCategory = classifyProductSize(
    input.product.lengthCm,
    input.product.widthCm,
    input.product.heightCm,
    input.product.weightKg,
  );
  const storageCostUnit = getStorageCostUnit(input, rates, sizeCategory);
  const freightCost = getNetFreightCost(input);
  const adsRate = 1 / input.scenario.roas;
  const difalRate = input.scenario.destinationIcmsRate - input.scenario.ownIcmsRate;
  const financialRateForTurnover =
    (1 + input.scenario.financialCostMonthlyRate) ** (input.scenario.turnoverDays / 30) - 1;

  return {
    costTotal,
    finalUnitCost,
    sizeCategory,
    storageCostUnit,
    freightCost,
    adsRate,
    difalRate,
    financialRateForTurnover,
  };
}

export function calculatePricing(
  input: PricingInput,
  rates: PricingRates = defaultRates,
): PricingResultDraft {
  assertRate(input.scenario.targetNetMarginRate, "Margem liquida alvo");

  const {
    costTotal,
    finalUnitCost,
    sizeCategory,
    storageCostUnit,
    freightCost,
    adsRate,
    difalRate,
    financialRateForTurnover,
  } = buildPricingContext(input, rates);

  const denominator =
    1 -
    (input.scenario.commissionRate +
      adsRate +
      input.scenario.simpleTaxRate +
      input.scenario.targetNetMarginRate +
      input.scenario.operationalCostRate +
      difalRate +
      financialRateForTurnover);

  if (denominator <= 0) {
    throw new Error("As taxas configuradas deixam o denominador do preco menor ou igual a zero.");
  }

  const salePrice = (finalUnitCost + freightCost + storageCostUnit) / denominator;
  const revenueTotal = salePrice * input.purchase.quantity;
  const adsInvestment = revenueTotal * adsRate;
  const netMarginUnitAmount = salePrice * input.scenario.targetNetMarginRate;
  const netMarginAmount = netMarginUnitAmount * input.purchase.quantity;
  const roi = netMarginAmount / costTotal;
  const annualizedRoi = (1 + roi) ** (365 / input.scenario.turnoverDays) - 1;
  const candidateResults = buildCandidateResults(input, salePrice, freightCost);

  const result: PricingResultDraft = {
    costTotal,
    finalUnitCost,
    sizeCategory,
    storageCostUnit,
    listingType: input.scenario.listingType,
    fulfillmentMode: input.scenario.fulfillmentMode,
    marketplaceShippingCost: input.scenario.marketplaceShippingCost,
    marketplaceShippingRebate: input.scenario.marketplaceShippingRebate,
    ownDeliveryCost: input.scenario.ownDeliveryCost,
    freightCost,
    salePrice,
    grossMarginRate: salePrice === 0 ? 0 : (salePrice - finalUnitCost - freightCost - storageCostUnit) / salePrice,
    multiplier: finalUnitCost === 0 ? 0 : salePrice / finalUnitCost,
    difalRate,
    adsRate,
    adsInvestment,
    denominator,
    financialRateForTurnover,
    netMarginAmount,
    netMarginUnitAmount,
    roi,
    annualizedRoi,
    revenueTotal,
    freightStatus: getFreightStatus(input),
    alerts: [],
    candidateResults,
    selectedBandLabel: candidateResults[0].bandLabel,
    ratesEffectiveFrom: rates.effectiveFrom,
  };

  result.alerts = buildAlerts(result, input);
  return result;
}

export function calculatePricingFromPrice(
  input: PricingInput,
  rates: PricingRates = defaultRates,
): PricingResultDraft {
  const targetSalePrice = input.scenario.targetSalePrice;
  if (!targetSalePrice || targetSalePrice <= 0) {
    throw new Error("Preco de venda alvo precisa ser maior que zero.");
  }

  const {
    costTotal,
    finalUnitCost,
    sizeCategory,
    storageCostUnit,
    freightCost,
    adsRate,
    difalRate,
    financialRateForTurnover,
  } = buildPricingContext(input, rates);

  const denominatorWithoutMargin =
    1 -
    (input.scenario.commissionRate +
      adsRate +
      input.scenario.simpleTaxRate +
      input.scenario.operationalCostRate +
      difalRate +
      financialRateForTurnover);

  const resultingNetMarginRate =
    denominatorWithoutMargin - (finalUnitCost + freightCost + storageCostUnit) / targetSalePrice;
  const revenueTotal = targetSalePrice * input.purchase.quantity;
  const adsInvestment = revenueTotal * adsRate;
  const netMarginUnitAmount = targetSalePrice * resultingNetMarginRate;
  const netMarginAmount = netMarginUnitAmount * input.purchase.quantity;
  const roi = netMarginAmount / costTotal;
  const annualizedRoi = (1 + roi) ** (365 / input.scenario.turnoverDays) - 1;
  const candidateResults = buildCandidateResults(input, targetSalePrice, freightCost);

  const result: PricingResultDraft = {
    costTotal,
    finalUnitCost,
    sizeCategory,
    storageCostUnit,
    listingType: input.scenario.listingType,
    fulfillmentMode: input.scenario.fulfillmentMode,
    marketplaceShippingCost: input.scenario.marketplaceShippingCost,
    marketplaceShippingRebate: input.scenario.marketplaceShippingRebate,
    ownDeliveryCost: input.scenario.ownDeliveryCost,
    freightCost,
    salePrice: targetSalePrice,
    grossMarginRate:
      targetSalePrice === 0
        ? 0
        : (targetSalePrice - finalUnitCost - freightCost - storageCostUnit) / targetSalePrice,
    multiplier: finalUnitCost === 0 ? 0 : targetSalePrice / finalUnitCost,
    difalRate,
    adsRate,
    adsInvestment,
    denominator: denominatorWithoutMargin,
    financialRateForTurnover,
    netMarginAmount,
    netMarginUnitAmount,
    roi,
    annualizedRoi,
    revenueTotal,
    freightStatus: getFreightStatus(input),
    alerts: [],
    candidateResults,
    selectedBandLabel: candidateResults[0].bandLabel,
    ratesEffectiveFrom: rates.effectiveFrom,
    resultingNetMarginRate,
  };

  if (resultingNetMarginRate < 0) {
    result.alerts.push({
      code: "LOW_MARGIN",
      severity: "critical",
      title: "Preco abaixo do custo",
      description: "Com este preco, as despesas superam a receita. A margem resultante e negativa.",
    });
  } else if (resultingNetMarginRate < 0.05) {
    result.alerts.push({
      code: "LOW_MARGIN",
      severity: "warning",
      title: "Margem resultante agressiva",
      description: "A margem calculada para este preco esta abaixo de 5%.",
    });
  }

  result.alerts.push(...buildAlerts(result, input));

  return result;
}

export function getDefaultPricingSnapshot() {
  return calculatePricing(samplePricingInput, defaultRates);
}

export { classifyProductSize, getFreightStatus, priceBands };
