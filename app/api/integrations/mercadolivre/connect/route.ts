import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { buildMercadoLivreAuthUrl } from "@/lib/integrations/mercadolivre";

export async function GET() {
  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildMercadoLivreAuthUrl(state));
  response.cookies.set("meli_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
