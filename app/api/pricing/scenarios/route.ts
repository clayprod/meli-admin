import { NextResponse } from "next/server";

import { clientIpFromHeaders } from "@/lib/auth/rate-limit";
import { getSession } from "@/lib/auth/session";
import { savePricingScenario } from "@/lib/db/queries";
import { pricingInputSchema } from "@/lib/pricing/schema";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const input = pricingInputSchema.parse(json);
    const saved = await savePricingScenario({
      orgId: session.orgId,
      userId: session.userId,
      ipAddress: clientIpFromHeaders(request.headers),
      input,
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao salvar o cenario.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
