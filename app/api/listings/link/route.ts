import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { linkProductToListing } from "@/lib/db/integration-queries";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { listingId?: string; productId?: string | null };

    if (!body.listingId) {
      throw new Error("listingId obrigatorio.");
    }

    await linkProductToListing(body.listingId, body.productId || null);
    revalidatePath("/listings");
    revalidatePath("/products");

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao vincular produto e listing.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
