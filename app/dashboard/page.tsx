import {
  BarChart3,
  CircleDollarSign,
  Megaphone,
  ReceiptText,
  ShoppingBag,
  Store,
  Target,
  TrendingUp,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AttentionPanel } from "@/components/dashboard/attention-panel";
import { DailyTrendChart } from "@/components/dashboard/daily-trend-chart";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSessionForPage } from "@/lib/auth/session";
import {
  getDashboardOverview,
  PERIOD_DAYS,
  type Delta,
  type PeriodKey,
} from "@/lib/db/dashboard-queries";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

const statusTone: Record<string, "success" | "warning" | "critical" | "info" | "neutral"> = {
  approved: "success",
  pending: "warning",
  rejected: "critical",
  cancelled: "critical",
  in_process: "info",
  refunded: "neutral",
  charged_back: "critical",
};

function trendFromDelta(d: Delta) {
  if (d.deltaPct == null) return undefined;
  const sign = d.deltaPct >= 0 ? "+" : "";
  return {
    label: `${sign}${d.deltaPct.toFixed(1)}% vs período anterior`,
    direction: (d.deltaPct >= 0 ? "up" : "down") as "up" | "down",
  };
}

function parsePeriod(value: string | undefined): PeriodKey {
  if (value === "7d" || value === "30d" || value === "90d") return value;
  return "30d";
}

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function DashboardPage({ searchParams }: Props) {
  const session = await requireSessionForPage();
  const params = await searchParams;
  const periodKey = parsePeriod(params.period);
  const data = await getDashboardOverview(session.orgId, periodKey);

  return (
    <AppShell
      currentPath="/dashboard"
      title="Dashboard"
      description={`Performance do seller — ${data.period.label.toLowerCase()}, atualizado a cada 5min via cron`}
      userEmail={session.email}
    >
      <div className="grid gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Comparações são vs os {PERIOD_DAYS[periodKey]} dias anteriores ao período atual.
          </p>
          <PeriodSelector current={periodKey} />
        </div>

        {/* KPIs row 1 — receita */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Receita bruta"
            value={formatCurrency(data.kpis.revenue.current)}
            helper="Soma de transaction_amount"
            tone="orange"
            icon={CircleDollarSign}
            trend={trendFromDelta(data.kpis.revenue)}
          />
          <MetricCard
            title="Líquido recebido"
            value={formatCurrency(data.kpis.netReceived.current)}
            helper="Após taxas ML + MP"
            tone="success"
            icon={TrendingUp}
            trend={trendFromDelta(data.kpis.netReceived)}
          />
          <MetricCard
            title="Pedidos"
            value={String(data.kpis.paymentsCount.current)}
            helper="Pagamentos no período"
            tone="info"
            icon={ShoppingBag}
            trend={trendFromDelta(data.kpis.paymentsCount)}
          />
          <MetricCard
            title="Ticket médio"
            value={formatCurrency(data.kpis.averageTicket.current)}
            helper="Receita / pedidos"
            tone="neutral"
            icon={ReceiptText}
            trend={trendFromDelta(data.kpis.averageTicket)}
          />
        </section>

        {/* KPIs row 2 — ads + listings */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Custo de ads"
            value={formatCurrency(data.kpis.adCost.current)}
            helper="Investimento em Product Ads"
            tone="warning"
            icon={Megaphone}
            trend={trendFromDelta(data.kpis.adCost)}
          />
          <MetricCard
            title="ROAS"
            value={data.kpis.roas.current > 0 ? `${data.kpis.roas.current.toFixed(2)}x` : "—"}
            helper="Receita / custo de ads"
            tone="info"
            icon={Target}
            trend={trendFromDelta(data.kpis.roas)}
          />
          <MetricCard
            title="Taxas marketplace"
            value={formatCurrency(data.kpis.marketplaceFees.current)}
            helper="Comissões ML cobradas"
            tone="warning"
            icon={ReceiptText}
            trend={trendFromDelta(data.kpis.marketplaceFees)}
          />
          <MetricCard
            title="Listings ativos"
            value={String(data.kpis.activeListings)}
            helper="Status active no ML"
            tone="success"
            icon={Store}
          />
        </section>

        <AttentionPanel attention={data.attention} details={data.attentionDetails} />

        <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <DailyTrendChart data={data.dailySeries} periodLabel={data.period.label} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="size-4 text-orange-500" />
                Top 5 por receita
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {data.topListings.length === 0 ? (
                <p className="text-sm text-slate-400">Sem dados ainda. Aguarde a próxima sincronização.</p>
              ) : (
                data.topListings.map((listing, i) => (
                  <div key={listing.itemId} className="flex items-center justify-between border-b border-slate-50 py-3 last:border-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-5 shrink-0 text-sm font-bold text-slate-300">{i + 1}</span>
                      <div className="min-w-0">
                        {listing.permalink ? (
                          <a
                            href={listing.permalink}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-sm font-medium text-slate-900 hover:underline"
                          >
                            {listing.title}
                          </a>
                        ) : (
                          <p className="truncate text-sm font-medium text-slate-900">{listing.title}</p>
                        )}
                        <p className="text-xs text-slate-400">{listing.paymentCount} pgtos · {listing.itemId}</p>
                      </div>
                    </div>
                    <span className="ml-3 shrink-0 text-sm font-semibold text-slate-900">
                      {formatCurrency(listing.revenue)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Pagamentos recentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentPayments.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-slate-400">Nenhum pagamento encontrado. Aguarde a próxima sincronização.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="px-6 py-3 font-medium text-slate-500">ID</th>
                    <th className="px-4 py-3 font-medium text-slate-500">Anúncio</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-500">Bruto</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-500">Líquido</th>
                    <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                    <th className="px-6 py-3 font-medium text-slate-500">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPayments.map((p) => (
                    <tr key={p.paymentId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-6 py-3 font-mono text-xs text-slate-400">{p.paymentId}</td>
                      <td className="max-w-[260px] truncate px-4 py-3 text-slate-700">
                        {p.listingTitle ?? "—"}
                        {p.listingItemId ? (
                          <span className="ml-2 font-mono text-xs text-slate-400">{p.listingItemId}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(p.transactionAmount)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {p.netReceivedAmount != null ? formatCurrency(p.netReceivedAmount) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone[p.status] ?? "neutral"}>{p.status}</Badge>
                      </td>
                      <td className="px-6 py-3 text-slate-400">
                        {p.approvedAt ? new Date(p.approvedAt).toLocaleDateString("pt-BR") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
