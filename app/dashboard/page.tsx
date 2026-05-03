import { BarChart3, CircleDollarSign, ReceiptText, Store, TrendingUp } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSessionForPage } from "@/lib/auth/session";
import { getFinanceDashboardData } from "@/lib/db/integration-queries";
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

export default async function DashboardPage() {
  const session = await requireSessionForPage();
  const data = await getFinanceDashboardData(session.orgId);

  const last = data.weeklySeries.at(-1);
  const prev = data.weeklySeries.at(-2);

  function trend(current: number | undefined, previous: number | undefined) {
    if (!current || !previous || previous === 0) return undefined;
    const pct = ((current - previous) / previous) * 100;
    const sign = pct >= 0 ? "+" : "";
    return {
      label: `${sign}${pct.toFixed(1)}% vs. semana anterior`,
      direction: pct >= 0 ? ("up" as const) : ("down" as const),
    };
  }

  return (
    <AppShell
      currentPath="/dashboard"
      title="Dashboard"
      description="Receita, pagamentos e performance dos seus produtos no Mercado Livre."
      userEmail={session?.email}
    >
      <div className="grid gap-6">
        {/* KPI cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="GMV (últimas 12 sem.)"
            value={formatCurrency(data.totals.gmv)}
            helper="Valor bruto transacionado"
            tone="orange"
            icon={CircleDollarSign}
            trend={trend(last?.gmv, prev?.gmv)}
          />
          <MetricCard
            title="Líquido recebido"
            value={formatCurrency(data.totals.net)}
            helper="Após taxas do Mercado Pago"
            tone="success"
            icon={TrendingUp}
            trend={trend(last?.net, prev?.net)}
          />
          <MetricCard
            title="Taxas marketplace"
            value={formatCurrency(data.totals.marketplaceFees)}
            helper="Comissão ML cobrada nos pagamentos"
            tone="warning"
            icon={ReceiptText}
          />
          <MetricCard
            title="Listings ativos"
            value={String(data.totals.activeListings)}
            helper="Anúncios com status ativo no ML"
            tone="info"
            icon={Store}
            trend={undefined}
          />
        </section>

        {/* Chart + Top listings */}
        <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <RevenueChart data={data.weeklySeries} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="size-4 text-orange-500" />
                Top 5 por receita
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {data.topListings.length === 0 ? (
                <p className="text-sm text-slate-400">Sem dados ainda. Sincronize os pagamentos.</p>
              ) : (
                data.topListings.map((listing, i) => (
                  <div key={listing.itemId} className="flex items-center justify-between border-b border-slate-50 py-3 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-bold text-slate-300 w-5 shrink-0">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{listing.title}</p>
                        <p className="text-xs text-slate-400">{listing.paymentCount} pgtos</p>
                      </div>
                    </div>
                    <span className="ml-3 shrink-0 text-sm font-semibold text-slate-900">{formatCurrency(listing.revenue)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        {/* Recent payments */}
        <Card>
          <CardHeader>
            <CardTitle>Pagamentos recentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentPayments.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-slate-400">Nenhum pagamento encontrado. Sincronize o Mercado Pago.</p>
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
                      <td className="max-w-[200px] truncate px-4 py-3 text-slate-700">{p.listingTitle ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(p.transactionAmount)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{p.netReceivedAmount != null ? formatCurrency(p.netReceivedAmount) : "—"}</td>
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
