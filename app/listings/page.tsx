import { AppShell } from "@/components/app-shell";
import { LinkListingControl } from "@/components/listings/link-listing-control";
import { UpdateListingControl } from "@/components/listings/update-listing-control";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSessionForPage } from "@/lib/auth/session";
import { getMarketplaceListingsOverview } from "@/lib/db/integration-queries";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ListingsPage() {
  const session = await requireSessionForPage();
  const overview = await getMarketplaceListingsOverview(session.orgId);

  return (
    <AppShell
      currentPath="/listings"
      title="Listings reais do marketplace"
      description="Camada de sincronizacao entre seus produtos internos e os itens reais do seller no Mercado Livre."
      userEmail={session.email}
    >
      <Card>
        <CardHeader>
          <CardTitle>Itens sincronizados do seller</CardTitle>
          <CardDescription>
            Compare preco atual, preco sugerido pela calculadora e promocoes/ads em cima de listings reais.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden rounded-3xl border border-slate-200 p-0">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Item</th>
                <th className="px-5 py-4 font-medium">Preco atual</th>
                <th className="px-5 py-4 font-medium">Preco sugerido</th>
                <th className="px-5 py-4 font-medium">Logistica</th>
                <th className="px-5 py-4 font-medium">Promos/Ads</th>
                <th className="px-5 py-4 font-medium">Vinculo interno</th>
              </tr>
            </thead>
            <tbody>
              {overview.listings.map((listing) => (
                <tr key={listing.id} className="border-t border-slate-100 align-top text-slate-700">
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <p className="font-medium text-slate-950">{listing.title}</p>
                      <p className="text-xs text-slate-500">{listing.itemId}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Badge tone={listing.status === "active" ? "success" : "warning"}>{listing.status}</Badge>
                        {listing.listingTypeId ? <Badge tone="info">{listing.listingTypeId}</Badge> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-2">
                      <p>{formatCurrency(listing.price)}</p>
                      <p className="text-xs text-slate-500">Estoque: {listing.availableQuantity}</p>
                      <UpdateListingControl
                        listingId={listing.id}
                        itemId={listing.itemId}
                        currentPrice={listing.price}
                        currentAvailableQuantity={listing.availableQuantity}
                        currentStatus={listing.status}
                        suggestedPrice={listing.suggestedPrice}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-4">{listing.suggestedPrice ? formatCurrency(listing.suggestedPrice) : "Sem calculo vinculado"}</td>
                  <td className="px-5 py-4">{listing.logisticType ?? "nao informado"}</td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <p>{listing.activePromotions} promocoes</p>
                      <p>{listing.latestAdCost ? `${formatCurrency(listing.latestAdCost)} em ads` : "Sem ads recentes"}</p>
                    </div>
                  </td>
                  <td className="min-w-[240px] px-5 py-4">
                    <LinkListingControl
                      listingId={listing.id}
                      currentProductId={listing.productId}
                      products={overview.products}
                    />
                    {listing.productName ? (
                      <p className="mt-2 text-xs text-slate-500">Atual: {listing.productName}</p>
                    ) : null}
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
