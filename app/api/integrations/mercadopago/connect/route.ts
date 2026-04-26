import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { buildMercadoPagoAuthUrl } from "@/lib/integrations/mercadopago";

export async function GET() {
  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildMercadoPagoAuthUrl(state));
  response.cookies.set("mercadopago_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
