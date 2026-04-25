import { AppShell } from "@/components/app-shell";
import { PricingWorkbench } from "@/components/pricing/pricing-workbench";

export default function PricingNewPage() {
  return (
    <AppShell
      currentPath="/pricing/new"
      title="Novo calculo de precificacao"
      description="Preencha o produto, lote, logistica e premissas comerciais para encontrar o preco sugerido com preview ao vivo."
    >
      <PricingWorkbench />
    </AppShell>
  );
}
