import { z } from "zod";

import type { PricingInput } from "@/lib/pricing/types";

const baseSchema = z.object({
  product: z.object({
    name: z.string().min(2, "Informe o nome do produto."),
    sku: z.string().min(2, "Informe o SKU."),
    weightKg: z.number().positive("Peso precisa ser maior que zero."),
    lengthCm: z.number().positive("Comprimento precisa ser maior que zero."),
    widthCm: z.number().positive("Largura precisa ser maior que zero."),
    heightCm: z.number().positive("Altura precisa ser maior que zero."),
  }),
  purchase: z.object({
    quantity: z.number().positive("Quantidade precisa ser maior que zero."),
    unitCostWithIpi: z.number().nonnegative("Custo unitario nao pode ser negativo."),
    taxSubstitution: z.number().nonnegative("ST nao pode ser negativa."),
  }),
});

export const pricingInputSchema = baseSchema.extend({
  scenario: z.object({
    name: z.string().min(2, "Dê um nome ao cenario."),
    listingType: z.enum(["CLASSICO", "PREMIUM"]),
    fulfillmentMode: z.enum(["FULL", "FLEX", "PROPRIA"]),
    commissionRate: z.number().min(0).max(0.99),
    marketplaceShippingCost: z.number().min(0).max(9999),
    marketplaceShippingRebate: z.number().min(0).max(9999),
    ownDeliveryCost: z.number().min(0).max(9999),
    roas: z.number().positive("ROAS precisa ser maior que zero."),
    operationalCostRate: z.number().min(0).max(0.99),
    simpleTaxRate: z.number().min(0).max(0.99),
    ownIcmsRate: z.number().min(0).max(0.99),
    destinationIcmsRate: z.number().min(0).max(0.99),
    financialCostMonthlyRate: z.number().min(0).max(0.99),
    targetNetMarginRate: z.number().min(0).max(0.99),
    turnoverDays: z.number().positive("Giro precisa ser maior que zero."),
    targetSalePrice: z.number().nonnegative().optional(),
  }),
});

export const pricingFormSchema = baseSchema.extend({
  scenario: z.object({
    name: z.string().min(2, "Dê um nome ao cenario."),
    listingType: z.enum(["CLASSICO", "PREMIUM"]),
    fulfillmentMode: z.enum(["FULL", "FLEX", "PROPRIA"]),
    commissionRate: z.number().min(0).max(99),
    marketplaceShippingCost: z.number().min(0).max(9999),
    marketplaceShippingRebate: z.number().min(0).max(9999),
    ownDeliveryCost: z.number().min(0).max(9999),
    roas: z.number().positive("ROAS precisa ser maior que zero."),
    operationalCostRate: z.number().min(0).max(99),
    simpleTaxRate: z.number().min(0).max(99),
    ownIcmsRate: z.number().min(0).max(99),
    destinationIcmsRate: z.number().min(0).max(99),
    financialCostMonthlyRate: z.number().min(0).max(99),
    targetNetMarginRate: z.number().min(0).max(99),
    turnoverDays: z.number().positive("Giro precisa ser maior que zero."),
    targetSalePrice: z.number().nonnegative().optional(),
  }),
});

export type PricingFormValues = z.infer<typeof pricingFormSchema>;

export function toPricingInput(values: PricingFormValues): PricingInput {
  return {
    ...values,
    scenario: {
      ...values.scenario,
      commissionRate: values.scenario.commissionRate / 100,
      operationalCostRate: values.scenario.operationalCostRate / 100,
      simpleTaxRate: values.scenario.simpleTaxRate / 100,
      ownIcmsRate: values.scenario.ownIcmsRate / 100,
      destinationIcmsRate: values.scenario.destinationIcmsRate / 100,
      financialCostMonthlyRate: values.scenario.financialCostMonthlyRate / 100,
      targetNetMarginRate: values.scenario.targetNetMarginRate / 100,
    },
  };
}
