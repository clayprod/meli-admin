import { BarChart3, Boxes, CircleDollarSign, Package2, TrendingUp, Truck } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { CostBreakdownChart } from "@/components/dashboard/cost-breakdown-chart";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { calculatePricing } from "@/lib/pricing/calculate-pricing";
import { samplePricingInput } from "@/lib/pricing/reference-data";

const snapshot = calculatePricing(samplePricingInput);

const breakdown = [
  {
    name: "Custo do lote",
    value: samplePricingInput.purchase.unitCostWithIpi * samplePricingInput.purchase.quantity,
    color: "#0f172a",
  },
  { name: "ST", value: samplePricingInput.purchase.taxSubstitution, color: "#38bdf8" },
  {
    name: "Frete total",
    value: snapshot.freightCost * samplePricingInput.purchase.quantity,
    color: "#10b981",
  },
  {
    name: "Armazenagem total",
    value: snapshot.storageCostUnit * samplePricingInput.purchase.quantity,
    color: "#f59e0b",
  },
  { name: "Margem alvo", value: snapshot.netMarginAmount, color: "#8b5cf6" },
];

export default function DashboardPage() {
  return (
    <AppShell
      currentPath="/dashboard"
      title="Dashboard operacional"
      description="Visao rapida do caso-base ja convertido da planilha, com indicadores de PV, ROI, ads e status de frete."
    >
      <div className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Preco sugerido"
            value={formatCurrency(snapshot.salePrice)}
            helper={`Faixa ativa: ${snapshot.selectedBandLabel}`}
            tone="success"
            icon={CircleDollarSign}
          />
          <MetricCard
            title="Margem liquida"
            value={formatCurrency(snapshot.netMarginAmount)}
            helper="Margem total estimada para o lote completo"
            tone="info"
            icon={TrendingUp}
          />
          <MetricCard
            title="ROI do lote"
            value={formatPercent(snapshot.roi)}
            helper={`ROI anualizado em ${formatPercent(snapshot.annualizedRoi)}`}
            tone={snapshot.roi >= 0.16 ? "success" : "warning"}
            icon={BarChart3}
          />
          <MetricCard
            title="Status do frete"
            value={snapshot.freightStatus.label}
            helper={`Custo atual: ${formatCurrency(snapshot.freightCost)}`}
            tone={snapshot.freightStatus.tone}
            icon={Truck}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <CostBreakdownChart data={breakdown} />

          <Card>
            <CardHeader>
              <CardTitle>Radar do MVP</CardTitle>
              <CardDescription>
                O que ja esta pronto nesta primeira entrega local e o que entra na proxima rodada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <p className="text-sm font-semibold text-emerald-900">Pronto agora</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-800">
                  <li>- motor de calculo com base na planilha</li>
                  <li>- preview local em tempo real</li>
                  <li>- schema Prisma e seeds iniciais</li>
                  <li>- shell da aplicacao e paginas principais</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Na proxima etapa</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <li>- persistir produtos e cenarios</li>
                  <li>- admin completo de tarifas</li>
                  <li>- importacao CSV/Excel e historico</li>
                  <li>- docker + github actions + ghcr</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader>
              <CardTitle>Produto de referencia</CardTitle>
              <CardDescription>
                Caso-base usado para validar a fidelidade do calculo contra a planilha original.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-slate-500">Produto</span>
                <span className="font-semibold text-slate-950">{samplePricingInput.product.name}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-slate-500">SKU</span>
                <span className="font-semibold text-slate-950">{samplePricingInput.product.sku}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-slate-500">Dimensoes</span>
                <span className="font-semibold text-slate-950">
                  {samplePricingInput.product.lengthCm} x {samplePricingInput.product.widthCm} x {samplePricingInput.product.heightCm} cm
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-slate-500">Lote</span>
                <span className="font-semibold text-slate-950">{samplePricingInput.purchase.quantity} unidades</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Indicadores do lote</CardTitle>
              <CardDescription>Resumo financeiro rapido para tomada de decisao de compra e anuncio.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <InfoRow icon={Package2} label="Custo total" value={formatCurrency(snapshot.costTotal)} />
              <InfoRow icon={Boxes} label="Armazenagem unit." value={formatCurrency(snapshot.storageCostUnit)} />
              <InfoRow icon={Truck} label="Frete final" value={formatCurrency(snapshot.freightCost)} />
              <InfoRow icon={CircleDollarSign} label="Faturamento total" value={formatCurrency(snapshot.revenueTotal)} />
              <InfoRow icon={BarChart3} label="Investimento ADS" value={formatCurrency(snapshot.adsInvestment)} />
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-500">Alertas</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {snapshot.alerts.map((alert) => (
                    <Badge key={alert.code} tone={alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "warning" : "info"}>
                      {alert.title}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
        </div>
      </div>
    </div>
  );
}
