import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { syncMercadoPagoPayments } from "@/lib/integrations/service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { days?: number };
    const result = await syncMercadoPagoPayments(body.days ?? 30);

    revalidatePath("/integrations");
    revalidatePath("/finance");

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao sincronizar Mercado Pago.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
