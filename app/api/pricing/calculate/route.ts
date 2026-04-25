import { NextResponse } from "next/server";

import { calculatePricing } from "@/lib/pricing/calculate-pricing";
import { pricingInputSchema } from "@/lib/pricing/schema";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = pricingInputSchema.parse(json);
    const result = calculatePricing(input);

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao calcular a precificacao.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
