import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { clientIpFromHeaders } from "@/lib/auth/rate-limit";
import { getSession } from "@/lib/auth/session";
import { linkProductToListing } from "@/lib/db/integration-queries";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { listingId?: string; productId?: string | null };

    if (!body.listingId) {
      throw new Error("listingId obrigatorio.");
    }

    await linkProductToListing({
      orgId: session.orgId,
      userId: session.userId,
      ipAddress: clientIpFromHeaders(request.headers),
      listingId: body.listingId,
      productId: body.productId || null,
    });
    revalidatePath("/listings");
    revalidatePath("/products");

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao vincular produto e listing.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
