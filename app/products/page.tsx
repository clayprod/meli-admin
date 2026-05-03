import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSessionForPage } from "@/lib/auth/session";
import { getProductsData } from "@/lib/db/queries";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const session = await requireSessionForPage();
  const products = await getProductsData(session.orgId);

  return (
    <AppShell
      currentPath="/products"
      title="Catalogo de produtos"
      description="Base inicial para o CRUD de produtos com peso, dimensoes e historico de precificacao."
      userEmail={session.email}
    >
      <Card>
        <CardHeader>
          <CardTitle>Produtos persistidos no catalogo</CardTitle>
          <CardDescription>
            Cada novo calculo salvo cria ou atualiza o produto pelo SKU e registra um novo lote para historico.
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
              {products.map((product) => (
                <tr key={product.id} className="border-t border-slate-100 text-slate-700">
                  <td className="px-5 py-4 font-medium text-slate-950">{product.name}</td>
                  <td className="px-5 py-4">{product.sku}</td>
                  <td className="px-5 py-4">{product.weightKg} kg</td>
                  <td className="px-5 py-4">{product.dimensionsLabel}</td>
                  <td className="px-5 py-4">{product.salePrice ? formatCurrency(product.salePrice) : "-"}</td>
                  <td className="px-5 py-4">
                    <Badge tone={product.active ? "success" : "warning"}>
                      {product.active ? "Ativo" : "Inativo"}
                    </Badge>
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
