import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { clientIpFromHeaders } from "@/lib/auth/rate-limit";
import { getSession } from "@/lib/auth/session";
import { updateMercadoLivreListing } from "@/lib/integrations/service";

type UpdateBody = {
  listingId?: string;
  price?: number;
  availableQuantity?: number;
  status?: "active" | "paused" | "closed";
  confirm?: boolean;
};

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as UpdateBody;

    if (!body.listingId) {
      throw new Error("listingId obrigatorio.");
    }
    if (body.confirm !== true) {
      throw new Error("Confirmacao obrigatoria para alterar o anuncio.");
    }

    const updated = await updateMercadoLivreListing({
      orgId: session.orgId,
      userId: session.userId,
      ipAddress: clientIpFromHeaders(request.headers),
      listingId: body.listingId,
      changes: {
        price: body.price,
        availableQuantity: body.availableQuantity,
        status: body.status,
      },
    });

    revalidatePath("/listings");

    return NextResponse.json({
      ok: true,
      listing: {
        id: updated.id,
        price: updated.price,
        availableQuantity: updated.availableQuantity,
        status: updated.status,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar anuncio.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
