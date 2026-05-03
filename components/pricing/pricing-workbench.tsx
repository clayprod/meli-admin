"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ArrowRightLeft, BarChart3, Boxes, Calculator, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { calculatePricing, calculatePricingFromPrice } from "@/lib/pricing/calculate-pricing";
import { samplePricingInput } from "@/lib/pricing/reference-data";
import {
  pricingFormSchema,
  type PricingFormValues,
  toPricingInput,
} from "@/lib/pricing/schema";
import type { FulfillmentMode, PricingResultDraft } from "@/lib/pricing/types";

type PricingMode = "margin" | "price";

type ListingOption = {
  id: string;
  itemId: string;
  title: string;
  price: number;
  listingTypeId: string | null;
  siteId: string;
  categoryId: string | null;
};

type PlatformQuote = {
  marketplaceShippingCost: number;
  marketplaceShippingRebate: number;
  currencyId: string;
  billableWeight?: number | null;
};

type PlatformContextResponse = {
  context: {
    listingId: string | null;
    itemId: string | null;
    title: string | null;
    siteId: string;
    categoryId: string | null;
    referencePrice: number;
    predictedFromTitle: boolean;
  };
  commissionSuggestions: {
    CLASSICO: { listingTypeId: string; listingTypeName: string; saleFeeRate: number } | null;
    PREMIUM: { listingTypeId: string; listingTypeName: string; saleFeeRate: number } | null;
  };
  shippingSuggestions: {
    FULL: PlatformQuote | null;
    FLEX: (PlatformQuote & { flexEnabled: boolean | null }) | null;
    PROPRIA: PlatformQuote;
  };
};

type ComparisonCard = {
  mode: FulfillmentMode;
  label: string;
  result: PricingResultDraft;
  usingApi: boolean;
  flexEnabled?: boolean | null;
};

const defaultValues: PricingFormValues = {
  ...samplePricingInput,
  scenario: {
    ...samplePricingInput.scenario,
    commissionRate: samplePricingInput.scenario.commissionRate * 100,
    operationalCostRate: samplePricingInput.scenario.operationalCostRate * 100,
    simpleTaxRate: samplePricingInput.scenario.simpleTaxRate * 100,
    ownIcmsRate: samplePricingInput.scenario.ownIcmsRate * 100,
    destinationIcmsRate: samplePricingInput.scenario.destinationIcmsRate * 100,
    financialCostMonthlyRate: samplePricingInput.scenario.financialCostMonthlyRate * 100,
    targetNetMarginRate: samplePricingInput.scenario.targetNetMarginRate * 100,
  },
};

function getModeLabel(mode: FulfillmentMode) {
  return mode === "FULL" ? "Full" : mode === "FLEX" ? "Flex" : "Logistica propria";
}

type TaxContext = {
  regime: string;
  anexo: string | null;
  rbt12: number | null;
  effectiveRate: number;
  bracketIndex: number;
  nominalRate: number;
} | null;

export function PricingWorkbench({
  listings,
  taxContext,
}: {
  listings: ListingOption[];
  taxContext?: TaxContext;
}) {
  const router = useRouter();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pricingMode, setPricingMode] = useState<PricingMode>("margin");
  const [selectedListingId, setSelectedListingId] = useState("");
  const [referencePrice, setReferencePrice] = useState(99.9);
  const [flexOwnDeliveryCost, setFlexOwnDeliveryCost] = useState(12);
  const [propriaOwnDeliveryCost, setPropriaOwnDeliveryCost] = useState(0);
  const [platformBusy, setPlatformBusy] = useState(false);
  const [platformError, setPlatformError] = useState<string | null>(null);
  const [platformContext, setPlatformContext] = useState<PlatformContextResponse | null>(null);

  const initialDefaults = useMemo<PricingFormValues>(() => {
    if (!taxContext) return defaultValues;
    return {
      ...defaultValues,
      scenario: {
        ...defaultValues.scenario,
        simpleTaxRate: Number((taxContext.effectiveRate * 100).toFixed(4)),
      },
    };
  }, [taxContext]);

  const form = useForm<PricingFormValues>({
    resolver: zodResolver(pricingFormSchema),
    defaultValues: initialDefaults,
    mode: "onChange",
  });

  const watchedValues = useWatch({ control: form.control }) as PricingFormValues;
  const selectedFulfillmentMode = watchedValues?.scenario?.fulfillmentMode ?? defaultValues.scenario.fulfillmentMode;
  const selectedListingType = watchedValues?.scenario?.listingType ?? defaultValues.scenario.listingType;
  const selectedListing = listings.find((listing) => listing.id === selectedListingId) ?? null;

  const calculation = useMemo(() => {
    const parsed = pricingFormSchema.safeParse(watchedValues);
    if (!parsed.success) return null;

    try {
      const input = toPricingInput(parsed.data);
      if (pricingMode === "price") {
        const targetSalePrice = parsed.data.scenario.targetSalePrice;
        if (!targetSalePrice || targetSalePrice <= 0) return null;
        return calculatePricingFromPrice({ ...input, scenario: { ...input.scenario, targetSalePrice } });
      }
      return calculatePricing(input);
    } catch {
      return null;
    }
  }, [watchedValues, pricingMode]);

  const comparisons = useMemo(() => {
    const parsed = pricingFormSchema.safeParse(watchedValues);
    if (!parsed.success || !platformContext) {
      return [] as ComparisonCard[];
    }

    const commissionSuggestion = platformContext.commissionSuggestions[selectedListingType];
    const commonInput = toPricingInput(parsed.data);

    const modes: FulfillmentMode[] = ["FULL", "FLEX", "PROPRIA"];

    return modes.flatMap((mode) => {
      const shippingSuggestion = platformContext.shippingSuggestions[mode];
      if (!shippingSuggestion) {
        return [];
      }

      const scenarioInput = {
        ...commonInput,
        scenario: {
          ...commonInput.scenario,
          listingType: selectedListingType,
          fulfillmentMode: mode,
          commissionRate: commissionSuggestion?.saleFeeRate ?? commonInput.scenario.commissionRate,
          marketplaceShippingCost: shippingSuggestion.marketplaceShippingCost,
          marketplaceShippingRebate: shippingSuggestion.marketplaceShippingRebate,
          ownDeliveryCost:
            mode === "FLEX" ? flexOwnDeliveryCost : mode === "PROPRIA" ? propriaOwnDeliveryCost : 0,
          targetSalePrice:
            pricingMode === "price" ? parsed.data.scenario.targetSalePrice : commonInput.scenario.targetSalePrice,
        },
      };

      const result =
        pricingMode === "price" && parsed.data.scenario.targetSalePrice
          ? calculatePricingFromPrice(scenarioInput)
          : calculatePricing(scenarioInput);

      return [
        {
          mode,
          label: getModeLabel(mode),
          result,
          usingApi: Boolean(commissionSuggestion || shippingSuggestion),
          flexEnabled:
            mode === "FLEX" && "flexEnabled" in shippingSuggestion
              ? shippingSuggestion.flexEnabled
              : undefined,
        },
      ];
    });
  }, [
    watchedValues,
    platformContext,
    selectedListingType,
    flexOwnDeliveryCost,
    propriaOwnDeliveryCost,
    pricingMode,
  ]);

  function applyPlatformSuggestion(mode: FulfillmentMode, context = platformContext) {
    if (!context) {
      return;
    }

    const commissionSuggestion = context.commissionSuggestions[selectedListingType];
    const shippingSuggestion = context.shippingSuggestions[mode];
    if (!shippingSuggestion) {
      return;
    }

    form.setValue("scenario.fulfillmentMode", mode, { shouldDirty: true, shouldTouch: true });

    if (commissionSuggestion) {
      form.setValue("scenario.commissionRate", Number((commissionSuggestion.saleFeeRate * 100).toFixed(2)), {
        shouldDirty: true,
        shouldTouch: true,
      });
    }

    form.setValue("scenario.marketplaceShippingCost", shippingSuggestion.marketplaceShippingCost, {
      shouldDirty: true,
      shouldTouch: true,
    });
    form.setValue("scenario.marketplaceShippingRebate", shippingSuggestion.marketplaceShippingRebate, {
      shouldDirty: true,
      shouldTouch: true,
    });
    form.setValue(
      "scenario.ownDeliveryCost",
      mode === "FLEX" ? flexOwnDeliveryCost : mode === "PROPRIA" ? propriaOwnDeliveryCost : 0,
      {
        shouldDirty: true,
        shouldTouch: true,
      },
    );
  }

  function handleListingSelection(nextListingId: string) {
    setSelectedListingId(nextListingId);
    const listing = listings.find((item) => item.id === nextListingId);
    if (listing) {
      setReferencePrice(listing.price);
      if (listing.listingTypeId === "gold_pro") {
        form.setValue("scenario.listingType", "PREMIUM", { shouldDirty: true, shouldTouch: true });
      }
      if (listing.listingTypeId === "gold_special") {
        form.setValue("scenario.listingType", "CLASSICO", { shouldDirty: true, shouldTouch: true });
      }
    }
  }

  async function handleConsultPlatform() {
    const parsed = pricingFormSchema.safeParse(form.getValues());
    if (!parsed.success) {
      setPlatformError("Preencha os campos obrigatorios para consultar a plataforma.");
      return;
    }

    setPlatformBusy(true);
    setPlatformError(null);

    try {
      const response = await fetchWithCsrf("/api/pricing/platform-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: selectedListingId || undefined,
          productName: parsed.data.product.name,
          siteId: selectedListing?.siteId,
          categoryId: selectedListing?.categoryId ?? undefined,
          referencePrice,
          listingType: parsed.data.scenario.listingType,
          weightKg: parsed.data.product.weightKg,
          lengthCm: parsed.data.product.lengthCm,
          widthCm: parsed.data.product.widthCm,
          heightCm: parsed.data.product.heightCm,
        }),
      });

      const body = (await response.json()) as PlatformContextResponse & { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Falha ao consultar Mercado Livre.");
      }

      setPlatformContext(body);
      applyPlatformSuggestion(parsed.data.scenario.fulfillmentMode, body);
    } catch (error) {
      setPlatformError(error instanceof Error ? error.message : "Falha ao consultar Mercado Livre.");
    } finally {
      setPlatformBusy(false);
    }
  }

  async function handleSaveScenario() {
    setSaveError(null);

    const isValid = await form.trigger();
    if (!isValid) {
      setSaveError("Revise os campos destacados antes de salvar.");
      return;
    }

    const values = form.getValues();
    const parsed = pricingFormSchema.safeParse(values);
    if (!parsed.success) {
      setSaveError("Nao foi possivel validar o cenario para salvar.");
      return;
    }

    setIsSaving(true);

    try {
      const input = toPricingInput(parsed.data);

      if (pricingMode === "price" && calculation?.resultingNetMarginRate != null) {
        input.scenario.targetNetMarginRate = calculation.resultingNetMarginRate;
      }

      const response = await fetchWithCsrf("/api/pricing/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const payload = (await response.json()) as { error?: string; scenarioId?: string };
      if (!response.ok) throw new Error(payload.error ?? "Falha ao salvar o cenario.");

      router.push("/scenarios");
      router.refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Falha ao salvar o cenario.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_420px]">
      <form className="grid gap-6">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-3">
                <Package className="size-5 text-orange-500" /> Produto e dimensoes
              </CardTitle>
              <CardDescription>
                Informacoes fisicas que afetam frete, Full e classificacao de tamanho.
              </CardDescription>
            </div>
            <Badge tone="info">Etapa 1</Badge>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Nome do produto" error={form.formState.errors.product?.name?.message}>
              <Input {...form.register("product.name")} placeholder="Ex.: Escova removedora" />
            </Field>
            <Field label="SKU" error={form.formState.errors.product?.sku?.message}>
              <Input {...form.register("product.sku")} placeholder="MELI-0001" />
            </Field>
            <Field label="Peso (kg)" error={form.formState.errors.product?.weightKg?.message}>
              <Input type="number" step="0.01" {...form.register("product.weightKg", { valueAsNumber: true })} />
            </Field>
            <Field label="Comprimento (cm)" error={form.formState.errors.product?.lengthCm?.message}>
              <Input type="number" step="0.1" {...form.register("product.lengthCm", { valueAsNumber: true })} />
            </Field>
            <Field label="Largura (cm)" error={form.formState.errors.product?.widthCm?.message}>
              <Input type="number" step="0.1" {...form.register("product.widthCm", { valueAsNumber: true })} />
            </Field>
            <Field label="Altura (cm)" error={form.formState.errors.product?.heightCm?.message}>
              <Input type="number" step="0.1" {...form.register("product.heightCm", { valueAsNumber: true })} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-3">
                <BarChart3 className="size-5 text-sky-600" /> Contexto Mercado Livre
              </CardTitle>
              <CardDescription>
                Use a API para sugerir comissao e custos da plataforma, e depois compare Full, Flex e propria.
              </CardDescription>
            </div>
            <Badge tone="info">API</Badge>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Anuncio base (opcional)">
                <Select value={selectedListingId} onChange={(event) => handleListingSelection(event.target.value)}>
                  <option value="">Simular sem anuncio</option>
                  {listings.map((listing) => (
                    <option key={listing.id} value={listing.id}>
                      {listing.title}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Preco de referencia ML (R$)" helper="Usado para consultar comissao e custo de envio na API.">
                <Input type="number" step="0.01" value={referencePrice} onChange={(event) => setReferencePrice(Number(event.target.value) || 0)} />
              </Field>
              <Field label="Seu custo Flex (R$)" helper="Ex.: motoboy na Grande SP.">
                <Input type="number" step="0.01" value={flexOwnDeliveryCost} onChange={(event) => setFlexOwnDeliveryCost(Number(event.target.value) || 0)} />
              </Field>
              <Field label="Seu custo entrega propria (R$)">
                <Input type="number" step="0.01" value={propriaOwnDeliveryCost} onChange={(event) => setPropriaOwnDeliveryCost(Number(event.target.value) || 0)} />
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={handleConsultPlatform} disabled={platformBusy}>
                {platformBusy ? "Consultando API..." : "Consultar custos do ML"}
              </Button>
              {platformContext ? (
                <>
                  <Badge tone="success">site {platformContext.context.siteId}</Badge>
                  {platformContext.context.categoryId ? <Badge tone="info">categoria {platformContext.context.categoryId}</Badge> : null}
                  {platformContext.context.predictedFromTitle ? <Badge tone="warning">categoria prevista pelo titulo</Badge> : null}
                </>
              ) : null}
            </div>

            {platformError ? <p className="text-sm font-medium text-red-600">{platformError}</p> : null}

            {platformContext ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <ResultStat
                  label="Comissao Classico"
                  value={platformContext.commissionSuggestions.CLASSICO ? formatPercent(platformContext.commissionSuggestions.CLASSICO.saleFeeRate) : "—"}
                />
                <ResultStat
                  label="Comissao Premium"
                  value={platformContext.commissionSuggestions.PREMIUM ? formatPercent(platformContext.commissionSuggestions.PREMIUM.saleFeeRate) : "—"}
                />
                <ResultStat
                  label="Custo Full sugerido"
                  value={platformContext.shippingSuggestions.FULL ? formatCurrency(platformContext.shippingSuggestions.FULL.marketplaceShippingCost) : "—"}
                />
                <ResultStat
                  label="Repasse Flex sugerido"
                  value={platformContext.shippingSuggestions.FLEX ? formatCurrency(platformContext.shippingSuggestions.FLEX.marketplaceShippingRebate) : "—"}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-3">
                <Boxes className="size-5 text-green-600" /> Lote e custo de compra
              </CardTitle>
              <CardDescription>
                Custo unitario com IPI, quantidade do lote e substituicao tributaria.
              </CardDescription>
            </div>
            <Badge tone="success">Etapa 2</Badge>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Field label="Quantidade" error={form.formState.errors.purchase?.quantity?.message}>
              <Input type="number" step="1" {...form.register("purchase.quantity", { valueAsNumber: true })} />
            </Field>
            <Field label="Custo unitario com IPI" error={form.formState.errors.purchase?.unitCostWithIpi?.message}>
              <Input type="number" step="0.01" {...form.register("purchase.unitCostWithIpi", { valueAsNumber: true })} />
            </Field>
            <Field label="Substituicao tributaria" error={form.formState.errors.purchase?.taxSubstitution?.message}>
              <Input type="number" step="0.01" {...form.register("purchase.taxSubstitution", { valueAsNumber: true })} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-3">
                <ArrowRightLeft className="size-5 text-amber-600" /> Logistica e comercial
              </CardTitle>
              <CardDescription>
                Preencha tipo de anuncio, modo logistico e os custos/repasse de frete que voce conhece.
              </CardDescription>
            </div>
            <Badge tone="warning">Etapa 3</Badge>
          </CardHeader>
          <CardContent className="grid gap-4">
            {/* Mode toggle */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 w-fit">
              <button
                type="button"
                onClick={() => setPricingMode("margin")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  pricingMode === "margin"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Definir margem
              </button>
              <button
                type="button"
                onClick={() => setPricingMode("price")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  pricingMode === "price"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Definir preco
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Nome do cenario" error={form.formState.errors.scenario?.name?.message}>
                <Input {...form.register("scenario.name")} placeholder="Conservador / Base / Agressivo" />
              </Field>
              <Field label="Tipo de anuncio" helper="Classico e Premium mudam a comissao da plataforma" error={form.formState.errors.scenario?.listingType?.message}>
                <Select {...form.register("scenario.listingType")}>
                  <option value="CLASSICO">Classico</option>
                  <option value="PREMIUM">Premium</option>
                </Select>
              </Field>
              <Field label="Modo logistico" helper="Full, Flex ou logistica propria" error={form.formState.errors.scenario?.fulfillmentMode?.message}>
                <Select {...form.register("scenario.fulfillmentMode")}>
                  <option value="FULL">Full</option>
                  <option value="FLEX">Flex</option>
                  <option value="PROPRIA">Logistica propria</option>
                </Select>
              </Field>
              <Field label="Comissao (%)" helper="13 para classico, 18 para premium" error={form.formState.errors.scenario?.commissionRate?.message}>
                <Input type="number" step="0.1" {...form.register("scenario.commissionRate", { valueAsNumber: true })} />
              </Field>
              <Field
                label="Custo cobrado pela plataforma (R$)"
                helper={selectedFulfillmentMode === "FULL" ? "Ex.: custo de frete/etiqueta do ML" : "Se nao houver custo direto do ML, deixe 0"}
                error={form.formState.errors.scenario?.marketplaceShippingCost?.message}
              >
                <Input type="number" step="0.01" {...form.register("scenario.marketplaceShippingCost", { valueAsNumber: true })} />
              </Field>
              <Field
                label="Repasse/subsidio do ML (R$)"
                helper={selectedFulfillmentMode === "FLEX" ? "Ex.: parte do frete que o ML devolve" : "Se nao houver repasse, deixe 0"}
                error={form.formState.errors.scenario?.marketplaceShippingRebate?.message}
              >
                <Input type="number" step="0.01" {...form.register("scenario.marketplaceShippingRebate", { valueAsNumber: true })} />
              </Field>
              <Field
                label="Seu custo de entrega (R$)"
                helper={selectedFulfillmentMode === "FLEX" ? "Ex.: motoboy de R$ 12,00 na Grande SP" : selectedFulfillmentMode === "PROPRIA" ? "Frete calculado por voce" : "No Full normalmente fica 0"}
                error={form.formState.errors.scenario?.ownDeliveryCost?.message}
              >
                <Input type="number" step="0.01" {...form.register("scenario.ownDeliveryCost", { valueAsNumber: true })} />
              </Field>
              <Field label="ROAS esperado" helper="Quanto maior, menor o % de ADS" error={form.formState.errors.scenario?.roas?.message}>
                <Input type="number" step="0.01" {...form.register("scenario.roas", { valueAsNumber: true })} />
              </Field>

              {pricingMode === "margin" ? (
                <Field label="Margem liquida alvo (%)" error={form.formState.errors.scenario?.targetNetMarginRate?.message}>
                  <Input type="number" step="0.1" {...form.register("scenario.targetNetMarginRate", { valueAsNumber: true })} />
                </Field>
              ) : (
                <Field label="Preco de venda alvo (R$)" helper="A margem resultante sera calculada" error={form.formState.errors.scenario?.targetSalePrice?.message}>
                  <Input type="number" step="0.01" {...form.register("scenario.targetSalePrice", { valueAsNumber: true })} />
                </Field>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-3">
                <BarChart3 className="size-5 text-violet-600" /> Fiscal e financeiro
              </CardTitle>
              <CardDescription>
                Impostos, DIFAL, custo financeiro e giro que alimentam o denominador do PV.
              </CardDescription>
            </div>
            <Badge tone="neutral">Etapa 4</Badge>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Custo operacional (%)" error={form.formState.errors.scenario?.operationalCostRate?.message}>
              <Input type="number" step="0.1" {...form.register("scenario.operationalCostRate", { valueAsNumber: true })} />
            </Field>
            <Field
              label="Impostos simples (%)"
              error={form.formState.errors.scenario?.simpleTaxRate?.message}
              helper={
                taxContext
                  ? `Default = aliquota efetiva da Org (Anexo ${taxContext.anexo}, RBT12 ${formatCurrency(
                      taxContext.rbt12 ?? 0,
                    )}). Editavel.`
                  : "Configure o RBT12 em Configuracoes para preencher automaticamente."
              }
            >
              <Input type="number" step="0.1" {...form.register("scenario.simpleTaxRate", { valueAsNumber: true })} />
            </Field>
            <Field label="ICMS proprio (%)" error={form.formState.errors.scenario?.ownIcmsRate?.message}>
              <Input type="number" step="0.1" {...form.register("scenario.ownIcmsRate", { valueAsNumber: true })} />
            </Field>
            <Field label="ICMS destino (%)" error={form.formState.errors.scenario?.destinationIcmsRate?.message}>
              <Input type="number" step="0.1" {...form.register("scenario.destinationIcmsRate", { valueAsNumber: true })} />
            </Field>
            <Field label="Custo financeiro a.m. (%)" error={form.formState.errors.scenario?.financialCostMonthlyRate?.message}>
              <Input type="number" step="0.1" {...form.register("scenario.financialCostMonthlyRate", { valueAsNumber: true })} />
            </Field>
            <Field label="Giro do estoque (dias)" error={form.formState.errors.scenario?.turnoverDays?.message}>
              <Input type="number" step="1" {...form.register("scenario.turnoverDays", { valueAsNumber: true })} />
            </Field>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => form.reset(defaultValues)} variant="outline">
            Restaurar caso-base
          </Button>
          <Button type="button" variant="secondary" onClick={handleSaveScenario} disabled={!calculation || isSaving}>
            {isSaving ? "Salvando..." : "Salvar cenario no banco"}
          </Button>
        </div>
        {saveError ? <p className="text-sm font-medium text-red-600">{saveError}</p> : null}
      </form>

      <div className="sticky top-4 h-fit self-start">
        <Card className="overflow-hidden border-slate-200/80">
          <CardHeader className="border-b border-slate-100 bg-[linear-gradient(180deg,_rgba(249,115,22,0.07),_rgba(255,255,255,0.7))]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-3">
                  <Calculator className="size-5 text-orange-500" /> Preview do resultado
                </CardTitle>
                <CardDescription>
                  {pricingMode === "margin"
                    ? "Informe a margem alvo e veja o preco sugerido."
                    : "Informe o preco alvo e veja a margem resultante."}
                </CardDescription>
              </div>
              {calculation ? <Badge tone={calculation.freightStatus.tone}>{calculation.freightStatus.label}</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {calculation ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {pricingMode === "margin" ? (
                    <ResultStat label="Preco sugerido" value={formatCurrency(calculation.salePrice)} strong />
                  ) : (
                    <>
                      <ResultStat
                        label="Margem resultante"
                        value={
                          calculation.resultingNetMarginRate != null
                            ? formatPercent(calculation.resultingNetMarginRate)
                            : "—"
                        }
                        strong
                      />
                      <ResultStat label="Preco informado" value={formatCurrency(calculation.salePrice)} />
                    </>
                  )}
                  <ResultStat label="Frete liquido" value={formatCurrency(calculation.freightCost)} />
                  <ResultStat label="Armazenagem unit." value={formatCurrency(calculation.storageCostUnit)} />
                  <ResultStat label="Custo unitario final" value={formatCurrency(calculation.finalUnitCost)} />
                  <ResultStat label="Margem bruta" value={formatPercent(calculation.grossMarginRate)} />
                  <ResultStat label="Margem liquida unit." value={formatCurrency(calculation.netMarginUnitAmount)} />
                  <ResultStat label="ROI" value={formatPercent(calculation.roi)} />
                  <ResultStat label="ROI anualizado" value={formatPercent(calculation.annualizedRoi)} />
                  <ResultStat label="Faturamento total" value={formatCurrency(calculation.revenueTotal)} strong />
                  <ResultStat label="Investimento ADS" value={formatCurrency(calculation.adsInvestment)} />
                </div>

                <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">Composicao da operacao</p>
                    <Badge tone="info">{calculation.selectedBandLabel}</Badge>
                  </div>
                  <div className="grid gap-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Tipo de anuncio</span>
                      <span className="font-medium text-slate-950">{calculation.listingType}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Modo logistico</span>
                      <span className="font-medium text-slate-950">{calculation.fulfillmentMode}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Custo da plataforma</span>
                      <span className="font-medium text-slate-950">{formatCurrency(calculation.marketplaceShippingCost)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Repasse do ML</span>
                      <span className="font-medium text-green-700">-{formatCurrency(calculation.marketplaceShippingRebate)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Seu custo de entrega</span>
                      <span className="font-medium text-slate-950">{formatCurrency(calculation.ownDeliveryCost)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Tamanho classificado</span>
                      <span className="font-medium text-slate-950">{calculation.sizeCategory}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Denominador PV</span>
                      <span className="font-medium text-slate-950">{formatNumber(calculation.denominator)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>% ADS</span>
                      <span className="font-medium text-slate-950">{formatPercent(calculation.adsRate)}</span>
                    </div>
                  </div>
                </div>

                {calculation.alerts.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-900">Alertas de decisao</p>
                    <div className="space-y-3">
                      {calculation.alerts.map((alert) => (
                        <div key={alert.code} className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex items-start gap-3">
                            <div className="rounded-full bg-slate-100 p-2 text-slate-700">
                              <AlertTriangle className="size-4" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-slate-950">{alert.title}</p>
                                <Badge tone={alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "warning" : "info"}>
                                  {alert.severity}
                                </Badge>
                              </div>
                              <p className="mt-1 text-sm leading-6 text-slate-500">{alert.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm leading-6 text-slate-500">
                {pricingMode === "price"
                  ? "Informe um preco de venda alvo para calcular a margem resultante."
                  : "Ajuste os campos obrigatorios para liberar o preview ao vivo do resultado."}
              </div>
            )}
          </CardContent>
        </Card>

        {comparisons.length > 0 ? (
          <Card className="mt-6 border-slate-200/80">
            <CardHeader>
              <CardTitle>Comparativo logistico</CardTitle>
              <CardDescription>
                Mesmos custos internos, anuncio {selectedListingType.toLowerCase()} e variacao entre Full, Flex e propria.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {comparisons.map((comparison) => (
                <div key={comparison.mode} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{comparison.label}</p>
                      <p className="text-xs text-slate-500">
                        {pricingMode === "margin"
                          ? `Preco sugerido ${formatCurrency(comparison.result.salePrice)}`
                          : `Margem ${comparison.result.resultingNetMarginRate != null ? formatPercent(comparison.result.resultingNetMarginRate) : "—"}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {comparison.usingApi ? <Badge tone="success">API ML</Badge> : <Badge tone="warning">manual</Badge>}
                      {comparison.mode === "FLEX" && comparison.flexEnabled === false ? <Badge tone="warning">Flex nao ativo</Badge> : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ResultStat label="Frete liquido" value={formatCurrency(comparison.result.freightCost)} />
                    <ResultStat label="Margem unitaria" value={formatCurrency(comparison.result.netMarginUnitAmount)} />
                    <ResultStat label="ROI" value={formatPercent(comparison.result.roi)} />
                    <ResultStat label="ADS" value={formatCurrency(comparison.result.adsInvestment)} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button type="button" size="sm" variant="secondary" onClick={() => applyPlatformSuggestion(comparison.mode)}>
                      Usar no formulario
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  helper,
  error,
  children,
}: {
  label: string;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
      {!error && helper ? <p className="text-xs leading-5 text-slate-500">{helper}</p> : null}
    </div>
  );
}

function ResultStat({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className={`mt-3 text-lg ${strong ? "font-semibold text-slate-950" : "font-medium text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}
