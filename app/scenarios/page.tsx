import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { calculatePricing } from "@/lib/pricing/calculate-pricing";
import { samplePricingInput } from "@/lib/pricing/reference-data";

const scenarios = [
  samplePricingInput,
  {
    ...samplePricingInput,
    scenario: { ...samplePricingInput.scenario, name: "Conservador", roas: 4.2, targetNetMarginRate: 0.05 },
  },
  {
    ...samplePricingInput,
    scenario: { ...samplePricingInput.scenario, name: "Agressivo", roas: 3.1, targetNetMarginRate: 0.025 },
  },
].map((scenario) => ({
  name: scenario.scenario.name,
  result: calculatePricing(scenario),
}));

export default function ScenariosPage() {
  return (
    <AppShell
      currentPath="/scenarios"
      title="Cenarios simulados"
      description="Comparativo inicial entre estrategias de margem e ROAS para o mesmo produto, ainda em memoria local."
    >
      <Card>
        <CardHeader>
          <CardTitle>Historico inicial de simulacoes</CardTitle>
          <CardDescription>
            A persistencia entra na proxima rodada. Por enquanto, o app ja mostra o formato da tabela e dos indicadores.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden rounded-3xl border border-slate-200 p-0">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Cenario</th>
                <th className="px-5 py-4 font-medium">PV</th>
                <th className="px-5 py-4 font-medium">ROI</th>
                <th className="px-5 py-4 font-medium">Margem</th>
                <th className="px-5 py-4 font-medium">Status do frete</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map(({ name, result }) => (
                <tr key={name} className="border-t border-slate-100 text-slate-700">
                  <td className="px-5 py-4 font-medium text-slate-950">{name}</td>
                  <td className="px-5 py-4">{formatCurrency(result.salePrice)}</td>
                  <td className="px-5 py-4">{formatPercent(result.roi)}</td>
                  <td className="px-5 py-4">{formatCurrency(result.netMarginUnitAmount)}</td>
                  <td className="px-5 py-4">
                    <Badge tone={result.freightStatus.tone}>{result.freightStatus.label}</Badge>
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
