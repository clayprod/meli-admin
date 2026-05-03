import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { writeAudit } from "@/lib/auth/audit";
import { clientIpFromHeaders } from "@/lib/auth/rate-limit";
import { getSession } from "@/lib/auth/session";
import { syncMercadoPagoPayments } from "@/lib/integrations/service";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { days?: number };
    const result = await syncMercadoPagoPayments(session.orgId, body.days ?? 30);

    revalidatePath("/integrations");
    revalidatePath("/finance");

    await writeAudit({
      orgId: session.orgId,
      userId: session.userId,
      ipAddress: clientIpFromHeaders(request.headers),
      entity: "IntegrationSync",
      entityId: "mercado_pago:payments",
      action: "SYNC_TRIGGERED",
      after: result as Prisma.InputJsonValue,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao sincronizar Mercado Pago.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
