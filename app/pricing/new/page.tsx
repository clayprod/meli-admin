import { AppShell } from "@/components/app-shell";
import { PricingWorkbench } from "@/components/pricing/pricing-workbench";
import { getMarketplaceListingsMinimal } from "@/lib/db/integration-queries";

export default async function PricingNewPage() {
  const listings = await getMarketplaceListingsMinimal();

  return (
    <AppShell
      currentPath="/pricing/new"
      title="Novo calculo de precificacao"
      description="Preencha o produto, lote, logistica e premissas comerciais para encontrar o preco sugerido com preview ao vivo."
    >
      <PricingWorkbench listings={listings} />
    </AppShell>
  );
}
