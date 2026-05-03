import { AppShell } from "@/components/app-shell";
import { PricingWorkbench } from "@/components/pricing/pricing-workbench";
import { requireSessionForPage } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getMarketplaceListingsMinimal } from "@/lib/db/integration-queries";
import { calculateSimplesEffectiveRate, type SimplesAnexo } from "@/lib/tax/simples-nacional";

export default async function PricingNewPage() {
  const session = await requireSessionForPage();
  const [listings, org] = await Promise.all([
    getMarketplaceListingsMinimal(session.orgId),
    prisma.org.findUnique({
      where: { id: session.orgId },
      select: { taxRegime: true, simplesAnexo: true, rbt12: true, effectiveTaxRate: true },
    }),
  ]);

  let taxContext = null as null | {
    regime: string;
    anexo: string | null;
    rbt12: number | null;
    effectiveRate: number;
    bracketIndex: number;
    nominalRate: number;
  };

  if (org?.taxRegime === "SIMPLES_NACIONAL" && org.rbt12 != null) {
    const computed = calculateSimplesEffectiveRate(
      org.rbt12,
      (org.simplesAnexo as SimplesAnexo | null) ?? "I",
    );
    taxContext = {
      regime: org.taxRegime,
      anexo: computed.anexo,
      rbt12: org.rbt12,
      effectiveRate: computed.effectiveRate,
      bracketIndex: computed.bracketIndex,
      nominalRate: computed.nominalRate,
    };
  }

  return (
    <AppShell
      currentPath="/pricing/new"
      title="Novo calculo de precificacao"
      description="Preencha o produto, lote, logistica e premissas comerciais para encontrar o preco sugerido com preview ao vivo."
      userEmail={session.email}
    >
      <PricingWorkbench listings={listings} taxContext={taxContext} />
    </AppShell>
  );
}
