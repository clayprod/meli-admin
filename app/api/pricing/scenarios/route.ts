import { NextResponse } from "next/server";

import { savePricingScenario } from "@/lib/db/queries";
import { pricingInputSchema } from "@/lib/pricing/schema";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = pricingInputSchema.parse(json);
    const saved = await savePricingScenario(input);

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao salvar o cenario.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
