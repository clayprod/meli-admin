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
    expect(result.selectedBandLabel).toBe("R$ 19 a R$ 48,99");
  });

  it("zera armazenagem quando nao e Full", () => {
    const result = calculatePricing({
      ...samplePricingInput,
      scenario: {
        ...samplePricingInput.scenario,
        logisticsType: "CLASSICO",
      },
    });

    expect(result.storageCostUnit).toBe(0);
  });

  it("usa frete seller_sub79 quando o frete fica por conta da operacao", () => {
    const result = calculatePricing({
      ...samplePricingInput,
      scenario: {
        ...samplePricingInput.scenario,
        freightPayer: "MINHA",
      },
    });

    expect(result.freightCost).toBeCloseTo(12.35, 2);
    expect(result.selectedBandLabel).toBe("R$ 19 a R$ 48,99");
  });

  it("mantem a faixa final quando nenhum PV cai dentro das anteriores", () => {
    const result = calculatePricing({
      ...samplePricingInput,
      purchase: {
        ...samplePricingInput.purchase,
        unitCostWithIpi: 90,
      },
    });

    expect(result.selectedBandLabel).toBe("A partir de R$ 200");
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
