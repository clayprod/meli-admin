import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { buildMercadoLivreAuthUrl } from "@/lib/integrations/mercadolivre";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildMercadoLivreAuthUrl(state));
  response.cookies.set(
    "meli_oauth_state",
    JSON.stringify({ state, orgId: session.orgId }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    },
  );

  return response;
}
