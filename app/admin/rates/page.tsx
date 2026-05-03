import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSessionForPage } from "@/lib/auth/session";
import { getRatesData } from "@/lib/db/queries";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RatesPage() {
  const session = await requireSessionForPage();
  const { freightRates, fullStorageRates } = await getRatesData();

  return (
    <AppShell
      currentPath="/admin/rates"
      title="Tarifas e parametros"
      description="Base administrativa inicial para vigencia de frete e armazenagem Full, pronta para sair do hardcode e ir ao banco."
      userEmail={session.email}
    >
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Faixas de frete seedadas</CardTitle>
            <CardDescription>
              Primeiras linhas da tabela flatten para o modelo relacional do Prisma.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden rounded-3xl border border-slate-200 p-0">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Label</th>
                  <th className="px-5 py-4 font-medium">Modo</th>
                  <th className="px-5 py-4 font-medium">Faixa preco</th>
                  <th className="px-5 py-4 font-medium">Custo</th>
                </tr>
              </thead>
              <tbody>
              {freightRates.map((rate) => (
                <tr key={rate.label} className="border-t border-slate-100 text-slate-700">
                  <td className="px-5 py-4">{rate.label}</td>
                  <td className="px-5 py-4">
                      <Badge tone={rate.freightMode === "fast" ? "success" : "info"}>{rate.freightMode}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      {rate.priceBandMin} a {rate.priceBandMax ?? "acima"}
                    </td>
                    <td className="px-5 py-4">{formatCurrency(rate.freightCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tarifas Full por tamanho</CardTitle>
            <CardDescription>Daily unit rate pronta para calculo de armazenagem do MVP.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fullStorageRates.map((rate) => (
              <div key={rate.sizeCategory} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">{rate.sizeCategory}</p>
                  <Badge tone="info">{formatCurrency(rate.dailyUnitRate)}/dia</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Faixas de estoque antigo: {rate.agedStorageLabels.join(" · ")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
