export type ListingType = "CLASSICO" | "PREMIUM";
export type FulfillmentMode = "FULL" | "FLEX" | "PROPRIA";
export type FreightMode = "standard" | "fast" | "seller_sub79";
export type SizeCategory = "PEQUENO" | "MEDIO" | "GRANDE" | "EXTRAGRANDE";

export type ProductDimensions = {
  name: string;
  sku: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type PurchaseDetails = {
  quantity: number;
  unitCostWithIpi: number;
  taxSubstitution: number;
};

export type PricingScenarioInput = {
  name: string;
  listingType: ListingType;
  fulfillmentMode: FulfillmentMode;
  commissionRate: number;
  marketplaceShippingCost: number;
  marketplaceShippingRebate: number;
  ownDeliveryCost: number;
  roas: number;
  operationalCostRate: number;
  simpleTaxRate: number;
  ownIcmsRate: number;
  destinationIcmsRate: number;
  financialCostMonthlyRate: number;
  targetNetMarginRate: number;
  turnoverDays: number;
  targetSalePrice?: number;
};

export type PricingInput = {
  product: ProductDimensions;
  purchase: PurchaseDetails;
  scenario: PricingScenarioInput;
};

export type PriceBand = {
  label: string;
  min: number;
  max: number | null;
  mode: Exclude<FreightMode, "seller_sub79">;
};

export type FreightRate = {
  label: string;
  minWeightKg: number;
  maxWeightKg: number | null;
  priceBandMin: number;
  priceBandMax: number | null;
  freightCost: number;
  freightMode: FreightMode;
  effectiveFrom: string;
  sourceUrl?: string;
};

export type FullStorageRate = {
  sizeCategory: SizeCategory;
  maxLengthCm: number | null;
  maxWidthCm: number | null;
  maxHeightCm: number | null;
  maxWeightKg: number | null;
  dailyUnitRate: number;
  effectiveFrom: string;
  agedStorageLabels: string[];
};

export type PricingRates = {
  priceBands: PriceBand[];
  freightRates: FreightRate[];
  fullStorageRates: FullStorageRate[];
  effectiveFrom: string;
};

export type PricingAlert = {
  code: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
};

export type FreightStatus = {
  code: string;
  label: string;
  tone: "neutral" | "success" | "warning";
};

export type FreightCandidate = {
  bandLabel: string;
  priceBandMin: number;
  priceBandMax: number | null;
  freightCost: number;
  salePrice: number;
  inBand: boolean;
};

export type PricingResultDraft = {
  costTotal: number;
  finalUnitCost: number;
  sizeCategory: SizeCategory;
  storageCostUnit: number;
  listingType: ListingType;
  fulfillmentMode: FulfillmentMode;
  marketplaceShippingCost: number;
  marketplaceShippingRebate: number;
  ownDeliveryCost: number;
  freightCost: number;
  salePrice: number;
  grossMarginRate: number;
  multiplier: number;
  difalRate: number;
  adsRate: number;
  adsInvestment: number;
  denominator: number;
  financialRateForTurnover: number;
  netMarginAmount: number;
  netMarginUnitAmount: number;
  roi: number;
  annualizedRoi: number;
  revenueTotal: number;
  freightStatus: FreightStatus;
  alerts: PricingAlert[];
  candidateResults: FreightCandidate[];
  selectedBandLabel: string;
  ratesEffectiveFrom: string;
  resultingNetMarginRate?: number;
};
