import crypto from "node:crypto";

import { getMercadoPagoConfig } from "@/lib/integrations/env";

type SignatureParts = { ts: string | null; v1: string | null };

function parseSignatureHeader(header: string | null): SignatureParts {
  if (!header) return { ts: null, v1: null };
  const parts = header.split(",").map((part) => part.trim());
  const map = new Map<string, string>();
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    map.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
  }
  return { ts: map.get("ts") ?? null, v1: map.get("v1") ?? null };
}

export type MercadoPagoSignatureCheck = "valid" | "invalid" | "skipped";

export function verifyMercadoPagoSignature(params: {
  headers: Headers;
  dataId: string | null;
}): MercadoPagoSignatureCheck {
  const { webhookSecret } = getMercadoPagoConfig();
  if (!webhookSecret) {
    return "skipped";
  }

  const { ts, v1 } = parseSignatureHeader(params.headers.get("x-signature"));
  const requestId = params.headers.get("x-request-id");

  if (!ts || !v1 || !requestId || !params.dataId) {
    return "invalid";
  }

  const manifest = `id:${params.dataId};request-id:${requestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", webhookSecret).update(manifest).digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(v1, "hex");
  if (expectedBuf.length !== receivedBuf.length) return "invalid";

  return crypto.timingSafeEqual(expectedBuf, receivedBuf) ? "valid" : "invalid";
}
