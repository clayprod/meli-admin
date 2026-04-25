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
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { calculatePricing } from "@/lib/pricing/calculate-pricing";
import { samplePricingInput } from "@/lib/pricing/reference-data";
import {
  pricingFormSchema,
  type PricingFormValues,
  toPricingInput,
} from "@/lib/pricing/schema";

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

export function PricingWorkbench() {
  const router = useRouter();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<PricingFormValues>({
    resolver: zodResolver(pricingFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const watchedValues = useWatch({ control: form.control }) as PricingFormValues;

  const calculation = useMemo(() => {
    const parsed = pricingFormSchema.safeParse(watchedValues);

    if (!parsed.success) {
      return null;
    }

    try {
      return calculatePricing(toPricingInput(parsed.data));
    } catch {
      return null;
    }
  }, [watchedValues]);

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
      const response = await fetch("/api/pricing/scenarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toPricingInput(parsed.data)),
      });

      const payload = (await response.json()) as { error?: string; scenarioId?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao salvar o cenario.");
      }

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
                <Package className="size-5 text-sky-600" /> Produto e dimensoes
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
                <Boxes className="size-5 text-emerald-600" /> Lote e custo de compra
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
                Defina Full, frete por conta, comissao e expectativa de ADS.
              </CardDescription>
            </div>
            <Badge tone="warning">Etapa 3</Badge>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Nome do cenario" error={form.formState.errors.scenario?.name?.message}>
              <Input {...form.register("scenario.name")} placeholder="Conservador / Base / Agressivo" />
            </Field>
            <Field label="Tipo de logistica" error={form.formState.errors.scenario?.logisticsType?.message}>
              <Select {...form.register("scenario.logisticsType")}>
                <option value="FULL">Full</option>
                <option value="CLASSICO">Classico</option>
              </Select>
            </Field>
            <Field label="Frete por conta" error={form.formState.errors.scenario?.freightPayer?.message}>
              <Select {...form.register("scenario.freightPayer")}>
                <option value="CLIENTE">Cliente</option>
                <option value="MINHA">Minha</option>
              </Select>
            </Field>
            <Field label="Comissao (%)" helper="13 para classico, 18 para premium" error={form.formState.errors.scenario?.commissionRate?.message}>
              <Input type="number" step="0.1" {...form.register("scenario.commissionRate", { valueAsNumber: true })} />
            </Field>
            <Field label="ROAS esperado" helper="Quanto maior, menor o % de ADS" error={form.formState.errors.scenario?.roas?.message}>
              <Input type="number" step="0.01" {...form.register("scenario.roas", { valueAsNumber: true })} />
            </Field>
            <Field label="Margem liquida alvo (%)" error={form.formState.errors.scenario?.targetNetMarginRate?.message}>
              <Input type="number" step="0.1" {...form.register("scenario.targetNetMarginRate", { valueAsNumber: true })} />
            </Field>
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
            <Field label="Impostos simples (%)" error={form.formState.errors.scenario?.simpleTaxRate?.message}>
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
        {saveError ? <p className="text-sm font-medium text-rose-600">{saveError}</p> : null}
      </form>

      <div className="sticky top-4 h-fit self-start">
        <Card className="overflow-hidden border-slate-200/80">
          <CardHeader className="border-b border-slate-100 bg-[linear-gradient(180deg,_rgba(14,165,233,0.08),_rgba(255,255,255,0.7))]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-3">
                  <Calculator className="size-5 text-sky-600" /> Preview do resultado
                </CardTitle>
                <CardDescription>
                  Atualizacao ao vivo com a mesma logica da planilha e resolucao de frete sem circularidade.
                </CardDescription>
              </div>
              {calculation ? <Badge tone={calculation.freightStatus.tone}>{calculation.freightStatus.label}</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {calculation ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ResultStat label="Preco sugerido" value={formatCurrency(calculation.salePrice)} strong />
                  <ResultStat label="Frete final" value={formatCurrency(calculation.freightCost)} />
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
                    <p className="text-sm font-semibold text-slate-900">Faixa de frete escolhida</p>
                    <Badge tone="info">{calculation.selectedBandLabel}</Badge>
                  </div>
                  <div className="grid gap-2 text-sm text-slate-600">
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

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-900">Resolucao de frete por faixa</p>
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Faixa</th>
                          <th className="px-4 py-3 font-medium">Frete</th>
                          <th className="px-4 py-3 font-medium">PV</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculation.candidateResults.map((candidate) => (
                          <tr key={candidate.bandLabel} className="border-t border-slate-100 text-slate-700">
                            <td className="px-4 py-3">{candidate.bandLabel}</td>
                            <td className="px-4 py-3">{formatCurrency(candidate.freightCost)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span>{formatCurrency(candidate.salePrice)}</span>
                                {candidate.inBand ? <Badge tone="success">Valida</Badge> : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm leading-6 text-slate-500">
                Ajuste os campos obrigatorios para liberar o preview ao vivo do resultado.
              </div>
            )}
          </CardContent>
        </Card>
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
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
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
