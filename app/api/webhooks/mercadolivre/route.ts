import { NextResponse } from "next/server";
import { IntegrationProvider } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  recordIntegrationWebhook,
  syncSingleMercadoLivreListing,
} from "@/lib/integrations/service";

type MlWebhookPayload = {
  topic?: string;
  resource?: string;
  user_id?: string | number;
  application_id?: string | number;
  attempts?: number;
  sent?: string;
  received?: string;
  id?: string | number;
};

function extractItemId(resource: string | null): string | null {
  if (!resource) return null;
  const match = resource.match(/\/items\/([^/?#]+)/i);
  return match?.[1] ?? null;
}

export async function POST(request: Request) {
  let payload: MlWebhookPayload = {};
  try {
    payload = (await request.json()) as MlWebhookPayload;
  } catch {
    return NextResponse.json({ received: true });
  }

  const externalUserId = payload.user_id != null ? String(payload.user_id) : null;
  const topic = String(payload.topic ?? payload.resource ?? "unknown");
  const resource = payload.resource ? String(payload.resource) : null;

  await recordIntegrationWebhook({
    provider: IntegrationProvider.MERCADO_LIVRE,
    topic,
    resource,
    externalEventId: payload.id != null ? String(payload.id) : null,
    externalUserId,
    payload: payload as Record<string, unknown>,
  });

  if (externalUserId) {
    const connection = await prisma.integrationConnection.findFirst({
      where: { provider: IntegrationProvider.MERCADO_LIVRE, externalUserId },
      select: { orgId: true },
    });

    if (connection) {
      try {
        if (topic.startsWith("items") || (resource && resource.startsWith("/items/"))) {
          const itemId = extractItemId(resource);
          if (itemId) {
            await syncSingleMercadoLivreListing(connection.orgId, itemId);
          }
        }
        // TODO: questions / orders_v2 / stock-locations dispatch
      } catch (error) {
        console.error("[webhook ml] dispatch failed", { topic, resource, error });
      }
    }
  }

  return NextResponse.json({ received: true });
}
