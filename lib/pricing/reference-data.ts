import type {
  FreightRate,
  FullStorageRate,
  PriceBand,
  PricingInput,
  PricingRates,
} from "@/lib/pricing/types";

const EFFECTIVE_FROM = "2026-01-01";
const FREIGHT_SOURCE_URL =
  "https://www.mercadolivre.com.br/ajuda/custos-envio-reputacao-verde-mercado-lider_40538";

type WeightBandSeed = {
  label: string;
  minWeightKg: number;
  maxWeightKg: number | null;
};

const weightBands: WeightBandSeed[] = [
  { label: "Ate 0,3 kg", minWeightKg: 0, maxWeightKg: 0.3 },
  { label: "De 0,3 a 0,5 kg", minWeightKg: 0.3, maxWeightKg: 0.5 },
  { label: "De 0,5 a 1 kg", minWeightKg: 0.5, maxWeightKg: 1 },
  { label: "De 1 a 1,5 kg", minWeightKg: 1, maxWeightKg: 1.5 },
  { label: "De 1,5 a 2 kg", minWeightKg: 1.5, maxWeightKg: 2 },
  { label: "De 2 a 3 kg", minWeightKg: 2, maxWeightKg: 3 },
  { label: "De 3 a 4 kg", minWeightKg: 3, maxWeightKg: 4 },
  { label: "De 4 a 5 kg", minWeightKg: 4, maxWeightKg: 5 },
  { label: "De 5 a 6 kg", minWeightKg: 5, maxWeightKg: 6 },
  { label: "De 6 a 7 kg", minWeightKg: 6, maxWeightKg: 7 },
  { label: "De 7 a 8 kg", minWeightKg: 7, maxWeightKg: 8 },
  { label: "De 8 a 9 kg", minWeightKg: 8, maxWeightKg: 9 },
  { label: "De 9 a 11 kg", minWeightKg: 9, maxWeightKg: 11 },
  { label: "De 11 a 13 kg", minWeightKg: 11, maxWeightKg: 13 },
  { label: "De 13 a 15 kg", minWeightKg: 13, maxWeightKg: 15 },
  { label: "De 15 a 17 kg", minWeightKg: 15, maxWeightKg: 17 },
  { label: "De 17 a 20 kg", minWeightKg: 17, maxWeightKg: 20 },
  { label: "De 20 a 25 kg", minWeightKg: 20, maxWeightKg: 25 },
  { label: "De 25 a 30 kg", minWeightKg: 25, maxWeightKg: 30 },
  { label: "De 30 a 40 kg", minWeightKg: 30, maxWeightKg: 40 },
  { label: "De 40 a 50 kg", minWeightKg: 40, maxWeightKg: 50 },
  { label: "De 50 a 60 kg", minWeightKg: 50, maxWeightKg: 60 },
  { label: "De 60 a 70 kg", minWeightKg: 60, maxWeightKg: 70 },
  { label: "De 70 a 80 kg", minWeightKg: 70, maxWeightKg: 80 },
  { label: "De 80 a 90 kg", minWeightKg: 80, maxWeightKg: 90 },
  { label: "De 90 a 100 kg", minWeightKg: 90, maxWeightKg: 100 },
  { label: "De 100 a 125 kg", minWeightKg: 100, maxWeightKg: 125 },
  { label: "De 125 a 150 kg", minWeightKg: 125, maxWeightKg: 150 },
  { label: "Mais de 150 kg", minWeightKg: 150, maxWeightKg: null },
];

export const priceBands: PriceBand[] = [
  { label: "R$ 0 a R$ 18,99", min: 0, max: 18.99, mode: "standard" },
  { label: "R$ 19 a R$ 48,99", min: 19, max: 48.99, mode: "standard" },
  { label: "R$ 49 a R$ 78,99", min: 49, max: 78.99, mode: "standard" },
  { label: "R$ 79 a R$ 99,99", min: 79, max: 99.99, mode: "fast" },
  { label: "R$ 100 a R$ 119,99", min: 100, max: 119.99, mode: "fast" },
  { label: "R$ 120 a R$ 149,99", min: 120, max: 149.99, mode: "fast" },
  { label: "R$ 150 a R$ 199,99", min: 150, max: 199.99, mode: "fast" },
  { label: "A partir de R$ 200", min: 200, max: null, mode: "fast" },
];

const bandValues = {
  standard0to18: [5.65, 5.95, 6.05, 6.15, 6.25, 6.35, 6.45, 6.55, 6.65, 6.75, 6.85, 6.95, 7.05, 7.15, 7.25, 7.35, 7.45, 7.65, 7.75, 7.85, 7.95, 8.05, 8.15, 8.25, 8.35, 8.45, 8.55, 8.65, 8.75],
  standard19to48: [6.55, 6.65, 6.75, 6.85, 6.95, 7.95, 8.15, 8.35, 8.55, 8.75, 8.95, 9.15, 9.55, 9.95, 10.15, 10.35, 10.55, 10.95, 11.15, 11.35, 11.55, 11.75, 11.95, 12.15, 12.35, 12.55, 12.75, 12.75, 12.95],
  standard49to78: [7.75, 7.85, 7.95, 8.05, 8.15, 8.55, 8.95, 9.75, 9.95, 10.15, 10.35, 10.55, 10.95, 11.35, 11.55, 11.75, 11.95, 12.15, 12.35, 12.55, 12.75, 12.95, 13.15, 13.35, 13.55, 13.75, 13.95, 14.15, 14.35],
  fast79to99: [12.35, 13.25, 13.85, 14.15, 14.45, 15.75, 17.05, 18.45, 25.45, 27.05, 28.85, 29.65, 41.25, 42.15, 45.05, 48.55, 54.75, 64.05, 65.95, 67.75, 70.25, 74.95, 80.25, 83.95, 93.25, 106.55, 119.25, 126.55, 166.15],
  fast100to119: [14.35, 15.45, 16.15, 16.45, 16.85, 18.35, 19.85, 21.55, 28.55, 31.05, 33.65, 34.55, 48.05, 49.25, 52.45, 56.05, 63.85, 75.05, 75.45, 78.95, 81.05, 86.45, 92.95, 97.05, 107.45, 123.95, 138.05, 146.15, 192.45],
  fast120to149: [16.45, 17.65, 18.45, 18.85, 19.25, 21.05, 22.65, 24.65, 32.65, 36.05, 38.45, 39.55, 54.95, 56.25, 59.95, 63.55, 72.95, 84.75, 85.55, 88.95, 92.05, 98.15, 105.05, 109.85, 122.05, 139.55, 156.05, 165.65, 217.55],
  fast150to199: [18.45, 19.85, 20.75, 21.15, 21.65, 23.65, 25.55, 27.75, 35.75, 40.05, 43.25, 44.45, 61.75, 63.25, 67.45, 70.75, 82.05, 95.35, 96.25, 99.15, 102.55, 109.35, 117.15, 122.45, 136.05, 155.55, 173.95, 184.65, 242.55],
  fast200plus: [20.95, 22.55, 23.65, 24.65, 24.65, 26.25, 28.35, 30.75, 39.75, 44.05, 48.05, 49.35, 68.65, 70.25, 74.95, 78.65, 91.15, 105.95, 106.95, 107.05, 110.75, 118.15, 126.55, 132.25, 146.95, 167.95, 187.95, 199.45, 261.95],
  sellerSub79: [12.35, 13.25, 13.85, 14.15, 14.45, 15.75, 17.05, 18.45, 25.45, 27.05, 28.85, 29.65, 41.25, 42.15, 45.05, 48.55, 54.75, 64.05, 65.95, 67.75, 70.25, 74.95, 80.25, 83.95, 93.25, 106.55, 119.25, 126.55, 166.15],
};

function buildFreightRates(): FreightRate[] {
  return weightBands.flatMap((weightBand, index) => [
    {
      label: `${weightBand.label} - ${priceBands[0].label}`,
      minWeightKg: weightBand.minWeightKg,
      maxWeightKg: weightBand.maxWeightKg,
      priceBandMin: 0,
      priceBandMax: 18.99,
      freightCost: bandValues.standard0to18[index],
      freightMode: "standard" as const,
      effectiveFrom: EFFECTIVE_FROM,
      sourceUrl: FREIGHT_SOURCE_URL,
    },
    {
      label: `${weightBand.label} - ${priceBands[1].label}`,
      minWeightKg: weightBand.minWeightKg,
      maxWeightKg: weightBand.maxWeightKg,
      priceBandMin: 19,
      priceBandMax: 48.99,
      freightCost: bandValues.standard19to48[index],
      freightMode: "standard" as const,
      effectiveFrom: EFFECTIVE_FROM,
      sourceUrl: FREIGHT_SOURCE_URL,
    },
    {
      label: `${weightBand.label} - ${priceBands[2].label}`,
      minWeightKg: weightBand.minWeightKg,
      maxWeightKg: weightBand.maxWeightKg,
      priceBandMin: 49,
      priceBandMax: 78.99,
      freightCost: bandValues.standard49to78[index],
      freightMode: "standard" as const,
      effectiveFrom: EFFECTIVE_FROM,
      sourceUrl: FREIGHT_SOURCE_URL,
    },
    {
      label: `${weightBand.label} - ${priceBands[3].label}`,
      minWeightKg: weightBand.minWeightKg,
      maxWeightKg: weightBand.maxWeightKg,
      priceBandMin: 79,
      priceBandMax: 99.99,
      freightCost: bandValues.fast79to99[index],
      freightMode: "fast" as const,
      effectiveFrom: EFFECTIVE_FROM,
      sourceUrl: FREIGHT_SOURCE_URL,
    },
    {
      label: `${weightBand.label} - ${priceBands[4].label}`,
      minWeightKg: weightBand.minWeightKg,
      maxWeightKg: weightBand.maxWeightKg,
      priceBandMin: 100,
      priceBandMax: 119.99,
      freightCost: bandValues.fast100to119[index],
      freightMode: "fast" as const,
      effectiveFrom: EFFECTIVE_FROM,
      sourceUrl: FREIGHT_SOURCE_URL,
    },
    {
      label: `${weightBand.label} - ${priceBands[5].label}`,
      minWeightKg: weightBand.minWeightKg,
      maxWeightKg: weightBand.maxWeightKg,
      priceBandMin: 120,
      priceBandMax: 149.99,
      freightCost: bandValues.fast120to149[index],
      freightMode: "fast" as const,
      effectiveFrom: EFFECTIVE_FROM,
      sourceUrl: FREIGHT_SOURCE_URL,
    },
    {
      label: `${weightBand.label} - ${priceBands[6].label}`,
      minWeightKg: weightBand.minWeightKg,
      maxWeightKg: weightBand.maxWeightKg,
      priceBandMin: 150,
      priceBandMax: 199.99,
      freightCost: bandValues.fast150to199[index],
      freightMode: "fast" as const,
      effectiveFrom: EFFECTIVE_FROM,
      sourceUrl: FREIGHT_SOURCE_URL,
    },
    {
      label: `${weightBand.label} - ${priceBands[7].label}`,
      minWeightKg: weightBand.minWeightKg,
      maxWeightKg: weightBand.maxWeightKg,
      priceBandMin: 200,
      priceBandMax: null,
      freightCost: bandValues.fast200plus[index],
      freightMode: "fast" as const,
      effectiveFrom: EFFECTIVE_FROM,
      sourceUrl: FREIGHT_SOURCE_URL,
    },
    {
      label: `${weightBand.label} - Minha abaixo de 79` ,
      minWeightKg: weightBand.minWeightKg,
      maxWeightKg: weightBand.maxWeightKg,
      priceBandMin: 0,
      priceBandMax: 78.99,
      freightCost: bandValues.sellerSub79[index],
      freightMode: "seller_sub79" as const,
      effectiveFrom: EFFECTIVE_FROM,
      sourceUrl: FREIGHT_SOURCE_URL,
    },
  ]);
}

const fullStorageRateSeeds: FullStorageRate[] = [
  {
    sizeCategory: "PEQUENO",
    maxLengthCm: 25,
    maxWidthCm: 15,
    maxHeightCm: 12,
    maxWeightKg: 18,
    dailyUnitRate: 0.007,
    effectiveFrom: EFFECTIVE_FROM,
    agedStorageLabels: ["Sem custo", "R$ 1,00", "R$ 12,00", "R$ 28,00"],
  },
  {
    sizeCategory: "MEDIO",
    maxLengthCm: 51,
    maxWidthCm: 36,
    maxHeightCm: 28,
    maxWeightKg: 18,
    dailyUnitRate: 0.015,
    effectiveFrom: EFFECTIVE_FROM,
    agedStorageLabels: ["Sem custo", "R$ 2,00", "R$ 15,00", "R$ 32,00"],
  },
  {
    sizeCategory: "GRANDE",
    maxLengthCm: 60,
    maxWidthCm: 60,
    maxHeightCm: 70,
    maxWeightKg: 18,
    dailyUnitRate: 0.05,
    effectiveFrom: EFFECTIVE_FROM,
    agedStorageLabels: ["Sem custo", "R$ 6,00", "R$ 37,00", "R$ 85,00"],
  },
  {
    sizeCategory: "EXTRAGRANDE",
    maxLengthCm: null,
    maxWidthCm: null,
    maxHeightCm: null,
    maxWeightKg: null,
    dailyUnitRate: 0.107,
    effectiveFrom: EFFECTIVE_FROM,
    agedStorageLabels: ["Sem custo", "R$ 8,00", "R$ 47,00", "R$ 131,00"],
  },
];

export const freightRates = buildFreightRates();

export const fullStorageRates: FullStorageRate[] = fullStorageRateSeeds;

export const defaultRates: PricingRates = {
  priceBands,
  freightRates,
  fullStorageRates,
  effectiveFrom: EFFECTIVE_FROM,
};

export const samplePricingInput: PricingInput = {
  product: {
    name: "Escova removedora Meli",
    sku: "MELI-0001",
    weightKg: 0.1,
    lengthCm: 26.6,
    widthCm: 13.1,
    heightCm: 3.6,
  },
  purchase: {
    quantity: 350,
    unitCostWithIpi: 3.9,
    taxSubstitution: 36.5,
  },
  scenario: {
    name: "Cenario Base",
    logisticsType: "FULL",
    freightPayer: "CLIENTE",
    commissionRate: 0.13,
    roas: 3.57,
    operationalCostRate: 0,
    simpleTaxRate: 0.06,
    ownIcmsRate: 0.04,
    destinationIcmsRate: 0.04,
    financialCostMonthlyRate: 0,
    targetNetMarginRate: 0.03,
    turnoverDays: 60,
  },
};
