import {
  defaultRates,
  priceBands,
  samplePricingInput,
} from "@/lib/pricing/reference-data";
import type {
  FreightCandidate,
  FreightPayer,
  FreightRate,
  FreightStatus,
  FullStorageRate,
  PriceBand,
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

function assertRate(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new Error(`${label} precisa ficar entre 0 e 1.`);
  }
}

function getWeightBand(weightKg: number, freightRates: FreightRate[]) {
  const weightBands = Array.from(
    new Map(
      freightRates.map((rate) => [
        `${rate.minWeightKg}-${rate.maxWeightKg ?? "plus"}`,
        {
          minWeightKg: rate.minWeightKg,
          maxWeightKg: rate.maxWeightKg,
        },
      ]),
    ).values(),
  ).sort((left, right) => left.minWeightKg - right.minWeightKg);

  return weightBands.reduce((selected, current) => {
    if (weightKg >= current.minWeightKg) {
      return current;
    }

    return selected;
  }, weightBands[0]);
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

function getFreightCostForBand(
  payer: FreightPayer,
  weightKg: number,
  band: PriceBand,
  rates: FreightRate[],
) {
  const weightBand = getWeightBand(weightKg, rates);
  const bandMode =
    payer === "MINHA" && band.max !== null && band.max <= 78.99
      ? "seller_sub79"
      : band.mode;

  const rate = rates.find(
    (entry) =>
      entry.freightMode === bandMode &&
      entry.minWeightKg === weightBand.minWeightKg &&
      entry.priceBandMin === (bandMode === "seller_sub79" ? 0 : band.min),
  );

  if (!rate) {
    throw new Error("Nao foi possivel localizar a tarifa de frete para a faixa escolhida.");
  }

  return rate.freightCost;
}

function getFreightStatus(salePrice: number, freightPayer: FreightPayer): FreightStatus {
  if (salePrice > 19 && salePrice < 79 && freightPayer !== "MINHA") {
    return {
      code: "FRETE_GRATIS_PADRAO",
      label: "Frete gratis padrao",
      tone: "success",
    };
  }

  if (salePrice <= 19 && freightPayer !== "MINHA") {
    return {
      code: "FRETE_PAGO_CLIENTE",
      label: "Frete pago pelo cliente",
      tone: "neutral",
    };
  }

  if (salePrice > 79 && freightPayer === "MINHA") {
    return {
      code: "MUDAR_PARA_CLIENTE",
      label: "Avaliar frete por conta do cliente",
      tone: "warning",
    };
  }

  return {
    code: "FRETE_GRATIS_RAPIDO",
    label: "Frete gratis rapido",
    tone: "success",
  };
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
      code: "LOW_MARGIN",
      severity: "warning",
      title: "Margem alvo agressiva",
      description: "A margem liquida configurada esta abaixo de 5%.",
    });
  }

  if (result.freightStatus.code === "MUDAR_PARA_CLIENTE") {
    alerts.push({
      code: "FREIGHT_MISMATCH",
      severity: "critical",
      title: "Frete desalinhado",
      description: "Com este preco, vale revisar o responsavel pelo frete para proteger a margem.",
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

export function calculatePricing(
  input: PricingInput,
  rates: PricingRates = defaultRates,
): PricingResultDraft {
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
  assertRate(input.scenario.targetNetMarginRate, "Margem liquida alvo");

  const costTotal =
    input.purchase.unitCostWithIpi * input.purchase.quantity +
    input.purchase.taxSubstitution;
  const finalUnitCost = costTotal / input.purchase.quantity;
  const sizeCategory = classifyProductSize(
    input.product.lengthCm,
    input.product.widthCm,
    input.product.heightCm,
    input.product.weightKg,
  );

  const storageRate = getStorageRate(sizeCategory, rates.fullStorageRates);
  const storageCostUnit =
    input.scenario.logisticsType === "FULL"
      ? ((input.purchase.quantity / 2) * storageRate.dailyUnitRate * input.scenario.turnoverDays) /
        input.purchase.quantity
      : 0;

  const adsRate = 1 / input.scenario.roas;
  const difalRate = input.scenario.destinationIcmsRate - input.scenario.ownIcmsRate;
  const financialRateForTurnover =
    (1 + input.scenario.financialCostMonthlyRate) **
      (input.scenario.turnoverDays / 30) -
    1;
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
    throw new Error(
      "As taxas configuradas deixam o denominador do preco menor ou igual a zero.",
    );
  }

  const candidateResults: FreightCandidate[] = rates.priceBands.map((band) => {
    const freightCost = getFreightCostForBand(
      input.scenario.freightPayer,
      input.product.weightKg,
      band,
      rates.freightRates,
    );
    const salePrice = (finalUnitCost + freightCost + storageCostUnit) / denominator;
    const inBand =
      salePrice >= band.min && (band.max === null ? true : salePrice <= band.max);

    return {
      bandLabel: band.label,
      priceBandMin: band.min,
      priceBandMax: band.max,
      freightCost,
      salePrice,
      inBand,
    };
  });

  const selectedCandidate =
    candidateResults.find((candidate) => candidate.inBand) ??
    candidateResults[candidateResults.length - 1];
  const salePrice = selectedCandidate.salePrice;
  const revenueTotal = salePrice * input.purchase.quantity;
  const adsInvestment = revenueTotal * adsRate;
  const netMarginAmount = salePrice * input.scenario.targetNetMarginRate * input.purchase.quantity;
  const netMarginUnitAmount = salePrice * input.scenario.targetNetMarginRate;
  const roi = netMarginAmount / costTotal;
  const annualizedRoi = (1 + roi) ** (365 / input.scenario.turnoverDays) - 1;
  const result: PricingResultDraft = {
    costTotal,
    finalUnitCost,
    sizeCategory,
    storageCostUnit,
    freightCost: selectedCandidate.freightCost,
    salePrice,
    grossMarginRate: (salePrice - input.purchase.unitCostWithIpi) / salePrice,
    multiplier: salePrice / input.purchase.unitCostWithIpi,
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
    freightStatus: getFreightStatus(salePrice, input.scenario.freightPayer),
    alerts: [],
    candidateResults,
    selectedBandLabel: selectedCandidate.bandLabel,
    ratesEffectiveFrom: rates.effectiveFrom,
  };

  result.alerts = buildAlerts(result, input);

  return result;
}

export function getDefaultPricingSnapshot() {
  return calculatePricing(samplePricingInput, defaultRates);
}

export { classifyProductSize, getFreightStatus, priceBands };
