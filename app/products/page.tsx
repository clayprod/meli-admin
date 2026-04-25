import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { calculatePricing } from "@/lib/pricing/calculate-pricing";
import { samplePricingInput } from "@/lib/pricing/reference-data";

const snapshot = calculatePricing(samplePricingInput);

export default function ProductsPage() {
  return (
    <AppShell
      currentPath="/products"
      title="Catalogo de produtos"
      description="Base inicial para o CRUD de produtos com peso, dimensoes e historico de precificacao."
    >
      <Card>
        <CardHeader>
          <CardTitle>Produtos seedados para o MVP</CardTitle>
          <CardDescription>
            Nesta primeira etapa, o app sobe com um produto de referencia para validar layout e calculo.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden rounded-3xl border border-slate-200 p-0">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Produto</th>
                <th className="px-5 py-4 font-medium">SKU</th>
                <th className="px-5 py-4 font-medium">Peso</th>
                <th className="px-5 py-4 font-medium">Dimensoes</th>
                <th className="px-5 py-4 font-medium">PV base</th>
                <th className="px-5 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100 text-slate-700">
                <td className="px-5 py-4 font-medium text-slate-950">{samplePricingInput.product.name}</td>
                <td className="px-5 py-4">{samplePricingInput.product.sku}</td>
                <td className="px-5 py-4">{samplePricingInput.product.weightKg} kg</td>
                <td className="px-5 py-4">
                  {samplePricingInput.product.lengthCm} x {samplePricingInput.product.widthCm} x {samplePricingInput.product.heightCm} cm
                </td>
                <td className="px-5 py-4">{formatCurrency(snapshot.salePrice)}</td>
                <td className="px-5 py-4">
                  <Badge tone="success">Ativo no MVP</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
