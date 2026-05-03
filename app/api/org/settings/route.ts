import { TaxRegime } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAudit } from "@/lib/auth/audit";
import { clientIpFromHeaders } from "@/lib/auth/rate-limit";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateSimplesEffectiveRate, type SimplesAnexo } from "@/lib/tax/simples-nacional";

const bodySchema = z.object({
  name: z.string().min(2).optional(),
  taxRegime: z.nativeEnum(TaxRegime).optional(),
  simplesAnexo: z.enum(["I", "II", "III", "IV", "V"]).nullable().optional(),
  rbt12: z.number().min(0).max(1_000_000_000).nullable().optional(),
});

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "OWNER" && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissao." }, { status: 403 });
  }

  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const before = await prisma.org.findUnique({
    where: { id: session.orgId },
    select: { name: true, taxRegime: true, simplesAnexo: true, rbt12: true, effectiveTaxRate: true },
  });

  let effectiveTaxRate: number | null | undefined = undefined;
  const nextRegime = payload.taxRegime ?? before?.taxRegime;
  const nextAnexo = payload.simplesAnexo === undefined ? before?.simplesAnexo : payload.simplesAnexo;
  const nextRbt12 = payload.rbt12 === undefined ? before?.rbt12 : payload.rbt12;

  if (nextRegime === TaxRegime.SIMPLES_NACIONAL && nextRbt12 != null) {
    const computed = calculateSimplesEffectiveRate(
      nextRbt12,
      (nextAnexo as SimplesAnexo | null) ?? "I",
    );
    effectiveTaxRate = computed.effectiveRate;
  } else if (payload.rbt12 === null || nextRegime !== TaxRegime.SIMPLES_NACIONAL) {
    effectiveTaxRate = null;
  }

  const updated = await prisma.org.update({
    where: { id: session.orgId },
    data: {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.taxRegime !== undefined ? { taxRegime: payload.taxRegime } : {}),
      ...(payload.simplesAnexo !== undefined ? { simplesAnexo: payload.simplesAnexo } : {}),
      ...(payload.rbt12 !== undefined ? { rbt12: payload.rbt12 } : {}),
      ...(effectiveTaxRate !== undefined ? { effectiveTaxRate } : {}),
    },
    select: { name: true, taxRegime: true, simplesAnexo: true, rbt12: true, effectiveTaxRate: true },
  });

  await writeAudit({
    orgId: session.orgId,
    userId: session.userId,
    ipAddress: clientIpFromHeaders(request.headers),
    entity: "Org",
    entityId: session.orgId,
    action: "ORG_SETTINGS_UPDATED",
    before: before ?? undefined,
    after: updated,
  });

  return NextResponse.json(updated);
}
