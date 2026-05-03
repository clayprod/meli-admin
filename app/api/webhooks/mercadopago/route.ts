import { NextResponse } from "next/server";
import { IntegrationProvider } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  recordIntegrationWebhook,
  syncSingleMercadoPagoPayment,
} from "@/lib/integrations/service";
import { verifyMercadoPagoSignature } from "@/lib/integrations/webhook-signature";

type MpWebhookPayload = {
  type?: string;
  topic?: string;
  action?: string;
  id?: string | number;
  resource?: string;
  user_id?: string | number;
  data?: { id?: string | number; user_id?: string | number };
  date_created?: string;
};

function extractMpDataId(payload: MpWebhookPayload): string | null {
  if (payload.data?.id != null) return String(payload.data.id);
  if (payload.id != null && (payload.type === "payment" || payload.topic === "payment")) {
    return String(payload.id);
  }
  if (payload.resource) {
    const match = payload.resource.match(/\/v\d+\/payments\/(\d+)/);
    if (match) return match[1];
  }
  return null;
}

function extractMpUserId(payload: MpWebhookPayload): string | null {
  if (payload.user_id != null) return String(payload.user_id);
  if (payload.data?.user_id != null) return String(payload.data.user_id);
  return null;
}

export async function POST(request: Request) {
  let payload: MpWebhookPayload = {};
  try {
    payload = (await request.json()) as MpWebhookPayload;
  } catch {
    return NextResponse.json({ received: true });
  }

  const dataId = extractMpDataId(payload);
  const externalUserId = extractMpUserId(payload);
  const topic = String(payload.type ?? payload.topic ?? "unknown");

  const signatureCheck = verifyMercadoPagoSignature({ headers: request.headers, dataId });
  if (signatureCheck === "invalid") {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  await recordIntegrationWebhook({
    provider: IntegrationProvider.MERCADO_PAGO,
    topic,
    resource: payload.resource ? String(payload.resource) : null,
    externalEventId: payload.id != null ? String(payload.id) : null,
    externalUserId,
    payload: payload as Record<string, unknown>,
  });

  if (dataId && (topic === "payment" || topic === "payment.created" || topic === "payment.updated")) {
    let orgId: string | null = null;

    if (externalUserId) {
      const connection = await prisma.integrationConnection.findFirst({
        where: { provider: IntegrationProvider.MERCADO_PAGO, externalUserId },
        select: { orgId: true },
      });
      orgId = connection?.orgId ?? null;
    }

    if (!orgId) {
      const directConnection = await prisma.integrationConnection.findFirst({
        where: { provider: IntegrationProvider.MERCADO_PAGO },
        orderBy: { updatedAt: "desc" },
        select: { orgId: true },
      });
      orgId = directConnection?.orgId ?? null;
    }

    if (orgId) {
      try {
        await syncSingleMercadoPagoPayment(orgId, dataId);
      } catch (error) {
        console.error("[webhook mp] dispatch failed", { dataId, error });
      }
    }
  }

  return NextResponse.json({ received: true });
}
