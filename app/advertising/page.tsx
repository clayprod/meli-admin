import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSessionForPage } from "@/lib/auth/session";
import { getAdvertisingOverview } from "@/lib/db/integration-queries";
import { formatCurrency, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdvertisingPage() {
  const session = await requireSessionForPage();
  const overview = await getAdvertisingOverview(session.orgId);

  return (
    <AppShell
      currentPath="/advertising"
      title="Publicidade e Product Ads"
      description="Acompanhe cliques, impressoes, gasto, ACOS, ROAS e vendas atribuidas por listing real."
      userEmail={session.email}
    >
      <div className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Cliques" value={formatNumber(overview.totals?.clicks ?? 0)} />
          <StatCard label="Impressoes" value={formatNumber(overview.totals?.impressions ?? 0)} />
          <StatCard label="Gasto" value={formatCurrency(overview.totals?.cost ?? 0)} />
          <StatCard label="Receita atribuida" value={formatCurrency(overview.totals?.totalAmount ?? 0)} />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Resumo por listing</CardTitle>
            <CardDescription>
              Consolidado com base nas metricas diarias de Product Ads retornadas pela API de advertising.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden rounded-3xl border border-slate-200 p-0">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Listing</th>
                  <th className="px-5 py-4 font-medium">Clicks</th>
                  <th className="px-5 py-4 font-medium">Impressoes</th>
                  <th className="px-5 py-4 font-medium">Gasto</th>
                  <th className="px-5 py-4 font-medium">ROAS / ACOS</th>
                  <th className="px-5 py-4 font-medium">Receita</th>
                </tr>
              </thead>
              <tbody>
                {overview.rows.map((row) => (
                  <tr key={row.itemId} className="border-t border-slate-100 text-slate-700">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-950">{row.title}</p>
                      <p className="text-xs text-slate-500">{row.itemId}</p>
                    </td>
                    <td className="px-5 py-4">{formatNumber(row.clicks)}</td>
                    <td className="px-5 py-4">{formatNumber(row.impressions)}</td>
                    <td className="px-5 py-4">{formatCurrency(row.cost)}</td>
                    <td className="px-5 py-4">ROAS {row.roas ?? 0} / ACOS {row.acos ?? 0}</td>
                    <td className="px-5 py-4">{formatCurrency(row.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
