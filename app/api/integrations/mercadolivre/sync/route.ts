import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  syncMercadoLivreAds,
  syncMercadoLivreListings,
  syncMercadoLivrePromotions,
} from "@/lib/integrations/service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { resource?: string; days?: number };
    let result: Record<string, unknown>;

    switch (body.resource) {
      case "promotions":
        result = await syncMercadoLivrePromotions();
        break;
      case "ads":
        result = await syncMercadoLivreAds(body.days ?? 14);
        break;
      case "listings":
      default:
        result = await syncMercadoLivreListings();
        break;
    }

    revalidatePath("/integrations");
    revalidatePath("/listings");
    revalidatePath("/promotions");
    revalidatePath("/advertising");

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao sincronizar Mercado Livre.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
