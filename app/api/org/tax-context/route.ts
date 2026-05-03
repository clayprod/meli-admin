import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateSimplesEffectiveRate, type SimplesAnexo } from "@/lib/tax/simples-nacional";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.org.findUnique({
    where: { id: session.orgId },
    select: { taxRegime: true, simplesAnexo: true, rbt12: true, effectiveTaxRate: true },
  });

  if (!org) {
    return NextResponse.json({ error: "Org nao encontrada." }, { status: 404 });
  }

  if (org.taxRegime !== "SIMPLES_NACIONAL" || !org.rbt12) {
    return NextResponse.json({
      taxRegime: org.taxRegime,
      simplesAnexo: org.simplesAnexo ?? null,
      rbt12: org.rbt12 ?? null,
      effectiveRate: org.effectiveTaxRate ?? null,
      computed: null,
    });
  }

  const computed = calculateSimplesEffectiveRate(
    org.rbt12,
    (org.simplesAnexo as SimplesAnexo | null) ?? "I",
  );

  return NextResponse.json({
    taxRegime: org.taxRegime,
    simplesAnexo: computed.anexo,
    rbt12: org.rbt12,
    effectiveRate: computed.effectiveRate,
    computed,
  });
}
