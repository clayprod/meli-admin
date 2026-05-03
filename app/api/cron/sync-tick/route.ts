import { IntegrationProvider } from "@prisma/client";
import { NextResponse } from "next/server";

import { verifyCronAuth } from "@/lib/auth/cron";
import { prisma } from "@/lib/db/prisma";
import {
  syncMercadoLivreAds,
  syncMercadoLivreListings,
  syncMercadoLivrePromotions,
  syncMercadoPagoPayments,
} from "@/lib/integrations/service";

type Scope = "payments" | "listings" | "promotions" | "ads" | "all";

type RunResult = {
  scope: Scope;
  orgs: Array<{
    orgId: string;
    success: boolean;
    summary?: Record<string, number>;
    error?: string;
  }>;
};

async function listOrgsWith(provider: IntegrationProvider): Promise<string[]> {
  const connections = await prisma.integrationConnection.findMany({
    where: { provider, status: { not: "DISCONNECTED" } },
    select: { orgId: true },
    distinct: ["orgId"],
  });
  return connections.map((c) => c.orgId);
}

async function runForOrgs(
  scope: Scope,
  orgs: string[],
  task: (orgId: string) => Promise<Record<string, number>>,
): Promise<RunResult["orgs"]> {
  const results: RunResult["orgs"] = [];
  for (const orgId of orgs) {
    try {
      const summary = await task(orgId);
      results.push({ orgId, success: true, summary });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.error(`[cron ${scope}] org ${orgId} failed:`, message);
      results.push({ orgId, success: false, error: message });
    }
  }
  return results;
}

export async function POST(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const scope = (url.searchParams.get("scope") ?? "all") as Scope;
  const results: RunResult[] = [];

  if (scope === "payments" || scope === "all") {
    const orgs = await listOrgsWith(IntegrationProvider.MERCADO_PAGO);
    const orgResults = await runForOrgs("payments", orgs, async (orgId) => {
      const r = await syncMercadoPagoPayments(orgId, 1);
      return r as unknown as Record<string, number>;
    });
    results.push({ scope: "payments", orgs: orgResults });
  }

  if (scope === "listings" || scope === "all") {
    const orgs = await listOrgsWith(IntegrationProvider.MERCADO_LIVRE);
    const orgResults = await runForOrgs("listings", orgs, async (orgId) => {
      const r = await syncMercadoLivreListings(orgId);
      return r as unknown as Record<string, number>;
    });
    results.push({ scope: "listings", orgs: orgResults });
  }

  if (scope === "promotions" || scope === "all") {
    const orgs = await listOrgsWith(IntegrationProvider.MERCADO_LIVRE);
    const orgResults = await runForOrgs("promotions", orgs, async (orgId) => {
      const r = await syncMercadoLivrePromotions(orgId);
      return r as unknown as Record<string, number>;
    });
    results.push({ scope: "promotions", orgs: orgResults });
  }

  if (scope === "ads" || scope === "all") {
    const orgs = await listOrgsWith(IntegrationProvider.MERCADO_LIVRE);
    const orgResults = await runForOrgs("ads", orgs, async (orgId) => {
      const r = await syncMercadoLivreAds(orgId);
      return r as unknown as Record<string, number>;
    });
    results.push({ scope: "ads", orgs: orgResults });
  }

  return NextResponse.json({ ok: true, results });
}
