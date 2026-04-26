import { NextResponse } from "next/server";
import { IntegrationProvider } from "@prisma/client";

import { recordIntegrationWebhook } from "@/lib/integrations/service";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    await recordIntegrationWebhook({
      provider: IntegrationProvider.MERCADO_LIVRE,
      topic: String(payload.topic ?? payload.resource ?? "unknown"),
      resource: payload.resource ? String(payload.resource) : null,
      externalEventId: payload.id ? String(payload.id) : null,
      externalUserId: payload.user_id ? String(payload.user_id) : null,
      payload,
    });

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ received: true });
  }
}
