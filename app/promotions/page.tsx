import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPromotionsOverview } from "@/lib/db/integration-queries";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PromotionsPage() {
  const overview = await getPromotionsOverview();

  return (
    <AppShell
      currentPath="/promotions"
      title="Promocoes e ofertas"
      description="Visualize campanhas do seller, cupons, ofertas do dia e outras promocoes reais ligadas aos itens sincronizados."
    >
      <Card>
        <CardHeader>
          <CardTitle>Promocoes detectadas por item</CardTitle>
          <CardDescription>
            A leitura inclui campanhas seller, smart campaigns, price matching, coupons e outras ofertas suportadas pelo `seller-promotions`.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden rounded-3xl border border-slate-200 p-0">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Promocao</th>
                <th className="px-5 py-4 font-medium">Item</th>
                <th className="px-5 py-4 font-medium">Preco promo</th>
                <th className="px-5 py-4 font-medium">Split desconto</th>
                <th className="px-5 py-4 font-medium">Janela</th>
              </tr>
            </thead>
            <tbody>
              {overview.promotions.map((promotion) => (
                <tr key={promotion.id} className="border-t border-slate-100 text-slate-700">
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <p className="font-medium text-slate-950">{promotion.name ?? promotion.promotionId}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone="info">{promotion.type}</Badge>
                        {promotion.subType ? <Badge tone="neutral">{promotion.subType}</Badge> : null}
                        <Badge tone={promotion.status === "started" ? "success" : "warning"}>{promotion.status}</Badge>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div>
                      <p>{promotion.listingTitle}</p>
                      <p className="text-xs text-slate-500">{promotion.itemId}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {promotion.dealPrice ? formatCurrency(promotion.dealPrice) : "-"}
                    {promotion.originalPrice ? <p className="text-xs text-slate-500">de {formatCurrency(promotion.originalPrice)}</p> : null}
                  </td>
                  <td className="px-5 py-4">
                    seller {promotion.sellerPercentage ?? 0}% / meli {promotion.meliPercentage ?? 0}%
                  </td>
                  <td className="px-5 py-4">
                    <p>{promotion.startDate ? new Date(promotion.startDate).toLocaleDateString("pt-BR") : "-"}</p>
                    <p className="text-xs text-slate-500">ate {promotion.finishDate ? new Date(promotion.finishDate).toLocaleDateString("pt-BR") : "-"}</p>
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
