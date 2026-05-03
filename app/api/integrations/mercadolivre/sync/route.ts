import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { writeAudit } from "@/lib/auth/audit";
import { clientIpFromHeaders } from "@/lib/auth/rate-limit";
import { getSession } from "@/lib/auth/session";
import {
  syncMercadoLivreAds,
  syncMercadoLivreListings,
  syncMercadoLivrePromotions,
} from "@/lib/integrations/service";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { resource?: string; days?: number };
    let result: Record<string, unknown>;

    switch (body.resource) {
      case "promotions":
        result = await syncMercadoLivrePromotions(session.orgId);
        break;
      case "ads":
        result = await syncMercadoLivreAds(session.orgId, body.days ?? 14);
        break;
      case "listings":
      default:
        result = await syncMercadoLivreListings(session.orgId);
        break;
    }

    revalidatePath("/integrations");
    revalidatePath("/listings");
    revalidatePath("/promotions");
    revalidatePath("/advertising");

    await writeAudit({
      orgId: session.orgId,
      userId: session.userId,
      ipAddress: clientIpFromHeaders(request.headers),
      entity: "IntegrationSync",
      entityId: `mercado_livre:${body.resource ?? "listings"}`,
      action: "SYNC_TRIGGERED",
      after: result as Prisma.InputJsonValue,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao sincronizar Mercado Livre.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
