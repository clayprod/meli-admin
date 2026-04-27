import { describe, expect, it } from "vitest";

import { calculatePricing } from "@/lib/pricing/calculate-pricing";
import { samplePricingInput } from "@/lib/pricing/reference-data";

describe("calculatePricing", () => {
  it("replica o caso-base da planilha com baixa tolerancia", () => {
    const result = calculatePricing(samplePricingInput);

    expect(result.salePrice).toBeCloseTo(22.0135, 3);
    expect(result.freightCost).toBeCloseTo(6.55, 2);
    expect(result.revenueTotal).toBeCloseTo(7704.7265, 2);
    expect(result.roi).toBeCloseTo(0.1649, 3);
    expect(result.annualizedRoi).toBeCloseTo(1.5311, 3);
    expect(result.selectedBandLabel).toBe("Full · Classico");
  });

  it("zera armazenagem quando nao e Full", () => {
    const result = calculatePricing({
      ...samplePricingInput,
      scenario: {
        ...samplePricingInput.scenario,
        fulfillmentMode: "FLEX",
      },
    });

    expect(result.storageCostUnit).toBe(0);
  });

  it("combina repasse do ML com custo proprio no Flex", () => {
    const result = calculatePricing({
      ...samplePricingInput,
      scenario: {
        ...samplePricingInput.scenario,
        fulfillmentMode: "FLEX",
        marketplaceShippingCost: 0,
        marketplaceShippingRebate: 4,
        ownDeliveryCost: 12,
      },
    });

    expect(result.freightCost).toBeCloseTo(8, 2);
    expect(result.selectedBandLabel).toBe("Flex · Classico");
  });

  it("permite logistica propria com custo manual", () => {
    const result = calculatePricing({
      ...samplePricingInput,
      scenario: {
        ...samplePricingInput.scenario,
        fulfillmentMode: "PROPRIA",
        marketplaceShippingCost: 0,
        marketplaceShippingRebate: 0,
        ownDeliveryCost: 18.4,
      },
    });

    expect(result.freightCost).toBeCloseTo(18.4, 2);
    expect(result.selectedBandLabel).toBe("Logistica propria · Classico");
  });

  it("falha com denominador invalido", () => {
    expect(() =>
      calculatePricing({
        ...samplePricingInput,
        scenario: {
          ...samplePricingInput.scenario,
          commissionRate: 0.4,
          simpleTaxRate: 0.3,
          targetNetMarginRate: 0.2,
          roas: 1.4,
        },
      }),
    ).toThrow(/denominador/);
  });
});
