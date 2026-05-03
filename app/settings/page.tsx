import { AppShell } from "@/components/app-shell";
import { OrgSettingsForm } from "@/components/settings/org-settings-form";
import { requireSessionForPage } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireSessionForPage();

  const org = await prisma.org.findUnique({
    where: { id: session.orgId },
    select: {
      name: true,
      taxRegime: true,
      simplesAnexo: true,
      rbt12: true,
      effectiveTaxRate: true,
    },
  });

  return (
    <AppShell
      currentPath="/settings"
      title="Configuracao da empresa"
      description="Regime tributario, aliquota efetiva calculada e dados fiscais usados na precificacao."
      userEmail={session.email}
    >
      <OrgSettingsForm
        initial={{
          name: org?.name ?? "",
          taxRegime: org?.taxRegime ?? "SIMPLES_NACIONAL",
          simplesAnexo: org?.simplesAnexo ?? null,
          rbt12: org?.rbt12 ?? null,
          effectiveTaxRate: org?.effectiveTaxRate ?? null,
        }}
      />
    </AppShell>
  );
}
