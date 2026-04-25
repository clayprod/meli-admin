import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getScenariosData } from "@/lib/db/queries";
import { formatCurrency, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ScenariosPage() {
  const scenarios = await getScenariosData();

  return (
    <AppShell
      currentPath="/scenarios"
      title="Cenarios simulados"
      description="Comparativo inicial entre estrategias de margem e ROAS para o mesmo produto, ainda em memoria local."
    >
      <Card>
        <CardHeader>
          <CardTitle>Historico persistido de simulacoes</CardTitle>
          <CardDescription>
            Toda vez que voce salva um novo calculo, o app registra o cenario, o lote e o resultado final no PostgreSQL.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden rounded-3xl border border-slate-200 p-0">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Cenario</th>
                <th className="px-5 py-4 font-medium">Produto</th>
                <th className="px-5 py-4 font-medium">PV</th>
                <th className="px-5 py-4 font-medium">ROI</th>
                <th className="px-5 py-4 font-medium">Margem</th>
                <th className="px-5 py-4 font-medium">Status do frete</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((scenario) => (
                <tr key={scenario.id} className="border-t border-slate-100 text-slate-700">
                  <td className="px-5 py-4 font-medium text-slate-950">{scenario.name}</td>
                  <td className="px-5 py-4">{scenario.productName}</td>
                  <td className="px-5 py-4">{formatCurrency(scenario.salePrice)}</td>
                  <td className="px-5 py-4">{formatPercent(scenario.roi)}</td>
                  <td className="px-5 py-4">{formatCurrency(scenario.netMarginUnitAmount)}</td>
                  <td className="px-5 py-4">
                    <Badge tone={scenario.freightStatus.tone}>{scenario.freightStatus.label}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
