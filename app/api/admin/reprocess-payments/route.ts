import { IntegrationProvider, type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { verifyCronAuth } from "@/lib/auth/cron";
import { prisma } from "@/lib/db/prisma";

type Charge = { type?: string; name?: string; amounts?: { original?: number; refunded?: number } };

function chargeAmount(charges: Charge[], name: string): number {
  return charges
    .filter((c) => c.type === "fee" && c.name === name)
    .reduce((total, c) => total + ((c.amounts?.original ?? 0) - (c.amounts?.refunded ?? 0)), 0);
}

export async function POST(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");
  const limit = Number(url.searchParams.get("limit") ?? "5000");

  const where: Prisma.FinancialPaymentWhereInput = orgId
    ? { connection: { orgId, provider: IntegrationProvider.MERCADO_PAGO } }
    : { connection: { provider: IntegrationProvider.MERCADO_PAGO } };

  const payments = await prisma.financialPayment.findMany({
    where,
    select: { id: true, paymentId: true, rawJson: true },
    take: limit,
  });

  let updated = 0;
  let skipped = 0;
  for (const payment of payments) {
    const raw = payment.rawJson;
    if (!raw || typeof raw !== "object") {
      skipped += 1;
      continue;
    }
    const charges = Array.isArray((raw as Record<string, unknown>).charges_details)
      ? ((raw as Record<string, unknown>).charges_details as Charge[])
      : [];

    const ml = chargeAmount(charges, "ml_sale_fee");
    const mp = chargeAmount(charges, "mp_processing_fee") + chargeAmount(charges, "financing_fee");

    await prisma.financialPayment.update({
      where: { id: payment.id },
      data: {
        marketplaceFeeAmount: ml || null,
        mercadopagoFeeAmount: mp || null,
      },
    });
    updated += 1;
  }

  return NextResponse.json({ ok: true, scanned: payments.length, updated, skipped });
}
