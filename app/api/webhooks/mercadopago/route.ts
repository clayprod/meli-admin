import { NextResponse } from "next/server";
import { IntegrationProvider } from "@prisma/client";

import { recordIntegrationWebhook } from "@/lib/integrations/service";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    await recordIntegrationWebhook({
      provider: IntegrationProvider.MERCADO_PAGO,
      topic: String(payload.type ?? payload.topic ?? "unknown"),
      resource: payload.resource ? String(payload.resource) : null,
      externalEventId: payload.id ? String(payload.id) : null,
      externalUserId:
        payload.user_id ? String(payload.user_id) : payload.data && typeof payload.data === "object" && "user_id" in payload.data
          ? String((payload.data as Record<string, unknown>).user_id ?? "") || null
          : null,
      payload,
    });

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ received: true });
  }
}
